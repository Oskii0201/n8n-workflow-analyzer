import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/lib/auth-helpers';
import { resolveConnection } from '@/src/lib/n8n-connection';
import { fetchN8n } from '@/src/lib/n8n-client';
import { requireString } from '@/src/lib/validation';
import { rateLimit } from '@/src/lib/rate-limit';
import type { SubworkflowEdge, SubworkflowWorkflowMeta, SubworkflowGraph } from '@/src/types/n8n';

interface ApiResponse {
  success: boolean;
  data?: SubworkflowGraph;
  error?: string;
}

function extractWorkflowId(raw: unknown): { id: string; isDynamic: boolean; expression?: string } | null {
  if (raw == null) return null;

  if (typeof raw === 'object' && raw !== null && '__rl' in raw) {
    const rl = raw as { __rl: boolean; value?: unknown };
    if (rl.__rl && typeof rl.value === 'string' && rl.value.length > 0) {
      return { id: rl.value, isDynamic: false };
    }
    return null;
  }

  if (typeof raw === 'string') {
    if (raw.startsWith('={{')) {
      return { id: `__dynamic__${raw}`, isDynamic: true, expression: raw };
    }
    if (raw.length > 0) {
      return { id: raw, isDynamic: false };
    }
  }

  return null;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const limit = rateLimit(request, 'n8n:subworkflow-graph', { limit: 10, windowMs: 60_000 })
    if (!limit.ok) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }
    const { user, supabase } = await getAuthContext();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const body = await request.json();
    const connectionId =
      body?.connectionId !== undefined
        ? requireString(body.connectionId, 'connectionId', { minLength: 1, trim: true })
        : null;

    if (connectionId && !connectionId.ok) {
      return NextResponse.json(
        { success: false, error: connectionId.error },
        { status: 400 }
      );
    }

    const resolved = await resolveConnection(
      supabase,
      user.id,
      connectionId ? connectionId.value : undefined
    );
    if (!resolved.ok) {
      return NextResponse.json(
        { success: false, error: resolved.error },
        { status: resolved.status }
      );
    }

    const normalizedUrl = resolved.baseUrl;

    // Fetch all workflows with pagination
    let allWorkflowsData: Record<string, unknown>[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const url = cursor
        ? `${normalizedUrl}/api/v1/workflows?limit=100&cursor=${cursor}`
        : `${normalizedUrl}/api/v1/workflows?limit=100`;

      const response = await fetchN8n<{ data?: Record<string, unknown>[]; nextCursor?: string }>(
        url,
        resolved.apiKey
      );

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: response.error },
          { status: response.status }
        );
      }

      allWorkflowsData = allWorkflowsData.concat(response.data.data || []);

      cursor = response.data.nextCursor;
      hasMore = !!cursor;
    }

    // Build a map of all workflows by ID
    const workflowMap = new Map<string, { id: string; name: string; active: boolean; updatedAt: string }>();
    for (const wf of allWorkflowsData) {
      if (wf.isArchived === true) continue;
      workflowMap.set(wf.id as string, {
        id: wf.id as string,
        name: wf.name as string,
        active: wf.active as boolean,
        updatedAt: wf.updatedAt as string,
      });
    }

    // Extract executeWorkflow edges
    const edges: SubworkflowEdge[] = [];
    const dynamicRefs: SubworkflowEdge[] = [];
    const participantIds = new Set<string>();
    const targetIds = new Set<string>();

    for (const wf of allWorkflowsData) {
      if (wf.isArchived === true) continue;
      if (!Array.isArray(wf.nodes)) continue;

      const callerId = wf.id as string;
      const callerName = wf.name as string;

      for (const node of wf.nodes as Record<string, unknown>[]) {
        if (node.type !== 'n8n-nodes-base.executeWorkflow') continue;

        const params = node.parameters as Record<string, unknown> | undefined;
        if (!params) continue;

        const extracted = extractWorkflowId(params.workflowId);
        if (!extracted) continue;

        const edge: SubworkflowEdge = {
          callerId,
          callerName,
          targetId: extracted.id,
          targetName: extracted.isDynamic ? null : (workflowMap.get(extracted.id)?.name ?? null),
          isDynamic: extracted.isDynamic,
          ...(extracted.expression ? { expression: extracted.expression } : {}),
        };

        edges.push(edge);
        participantIds.add(callerId);

        if (extracted.isDynamic) {
          dynamicRefs.push(edge);
        } else {
          targetIds.add(extracted.id);
          participantIds.add(extracted.id);
        }
      }
    }

    // Determine missing targets (referenced but not in fetched workflows)
    const missingTargets: string[] = [];
    for (const tid of targetIds) {
      if (!workflowMap.has(tid)) {
        missingTargets.push(tid);
      }
    }

    // Build workflows metadata map (only participants)
    const workflows: Record<string, SubworkflowWorkflowMeta> = {};
    for (const id of participantIds) {
      const meta = workflowMap.get(id);
      if (meta) {
        workflows[id] = meta;
      }
    }

    return NextResponse.json({
      success: true,
      data: { edges, workflows, missingTargets, dynamicRefs }
    });

  } catch (error) {
    console.error('Subworkflow graph fetch error:', error);
    return NextResponse.json({
      success: false,
      error: `Error fetching subworkflow graph: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
