import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/lib/auth-helpers';
import { resolveConnection } from '@/src/lib/n8n-connection';
import { fetchN8n } from '@/src/lib/n8n-client';
import { requireString } from '@/src/lib/validation';
import { rateLimit } from '@/src/lib/rate-limit';

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: number;
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data?: { workflows: Workflow[] };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const limit = rateLimit(request, 'n8n:workflows', { limit: 30, windowMs: 60_000 })
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

    const workflows: Workflow[] = allWorkflowsData
      .filter((workflow: Record<string, unknown>) => workflow.isArchived !== true)
      .map((workflow: Record<string, unknown>) => ({
        id: workflow.id as string,
        name: workflow.name as string,
        active: workflow.active as boolean,
        nodes: Array.isArray(workflow.nodes) ? workflow.nodes.length : 0,
        updatedAt: workflow.updatedAt as string
      }));

    return NextResponse.json({
      success: true,
      data: { workflows }
    });

  } catch (error) {
    console.error('Workflows fetch error:', error);
    return NextResponse.json({
      success: false,
      error: `Error fetching workflows: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
