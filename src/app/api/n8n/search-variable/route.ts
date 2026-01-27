import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/lib/auth-helpers';
import { resolveConnection } from '@/src/lib/n8n-connection';
import { fetchN8n } from '@/src/lib/n8n-client';
import { requireString } from '@/src/lib/validation';
import { rateLimit } from '@/src/lib/rate-limit';

interface NodeData {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

interface WorkflowData {
  id: string;
  name: string;
  nodes: NodeData[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SearchMatch {
  field: string;
  expression: string;
  fullValue: string;
  context: string;
  matchIndex: number;
}

interface SearchResult {
  nodeName: string;
  nodeType: string;
  nodeId: string;
  matches: SearchMatch[];
}

interface ApiResponse {
  success: boolean;
  data?: { results: SearchResult[] };
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const limit = rateLimit(request, 'n8n:search-variable', { limit: 20, windowMs: 60_000 })
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
    const workflowId = requireString(body?.workflowId, 'workflowId', { minLength: 1, trim: true });
    const searchTerm = requireString(body?.searchTerm, 'searchTerm', { minLength: 1, trim: true });

    if (connectionId && !connectionId.ok) {
      return NextResponse.json(
        { success: false, error: connectionId.error },
        { status: 400 }
      );
    }
    if (!workflowId.ok) {
      return NextResponse.json(
        { success: false, error: workflowId.error },
        { status: 400 }
      );
    }
    if (!searchTerm.ok) {
      return NextResponse.json(
        { success: false, error: searchTerm.error },
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

    const workflowResponse = await fetchN8n<WorkflowData | { data?: WorkflowData }>(
      `${normalizedUrl}/api/v1/workflows/${workflowId.value}`,
      resolved.apiKey
    );

    if (!workflowResponse.ok) {
      return NextResponse.json(
        { success: false, error: workflowResponse.error },
        { status: workflowResponse.status }
      );
    }

    const workflowResponseData = workflowResponse.data;
    const workflow: WorkflowData =
      (workflowResponseData as { data?: WorkflowData }).data || (workflowResponseData as WorkflowData);
    if (!workflow || !workflow.nodes) {
      return NextResponse.json({
        success: false,
        error: 'Invalid workflow data received from n8n'
      }, { status: 500 });
    }

    const results: SearchResult[] = [];

    workflow.nodes.forEach((node: NodeData) => {
      const matches: SearchMatch[] = [];
      let matchIndex = 0;

      const searchInObject = (obj: Record<string, unknown>, path: string) => {
        if (!obj || typeof obj !== 'object') return;

        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;

          if (typeof value === 'string') {
            const isCodeNode = node.type === 'n8n-nodes-base.code' ||
                             node.type === 'n8n-nodes-base.function' ||
                             node.type === 'n8n-nodes-base.functionItem';

            // For code nodes, prioritize JavaScript patterns for better context
            const jsPatterns = [
              new RegExp(`function\\s+${escapeRegex(searchTerm.value)}\\s*\\(`, 'gi'), // Function declarations
              new RegExp(`const\\s+${escapeRegex(searchTerm.value)}\\s*=`, 'gi'), // const declarations
              new RegExp(`let\\s+${escapeRegex(searchTerm.value)}\\s*=`, 'gi'), // let declarations
              new RegExp(`var\\s+${escapeRegex(searchTerm.value)}\\s*=`, 'gi'), // var declarations
              new RegExp(`\\.${escapeRegex(searchTerm.value)}\\s*\\(`, 'gi'), // Method calls
              new RegExp(`\\.${escapeRegex(searchTerm.value)}\\b`, 'gi'), // Property access
              new RegExp(`${escapeRegex(searchTerm.value)}\\s*=\\s*`, 'gi'), // Assignments
              new RegExp(`${escapeRegex(searchTerm.value)}\\s*\\(`, 'gi'), // Function calls
              new RegExp(`\\[['"]${escapeRegex(searchTerm.value)}['"]\\]`, 'gi'), // Bracket notation
              new RegExp(`${escapeRegex(searchTerm.value)}\\s*:`, 'gi'), // Object properties
              new RegExp(`class\\s+${escapeRegex(searchTerm.value)}\\b`, 'gi'), // Class declarations
              new RegExp(`new\\s+${escapeRegex(searchTerm.value)}\\s*\\(`, 'gi'), // Constructor calls
              new RegExp(`import.*${escapeRegex(searchTerm.value)}`, 'gi'), // Import statements
              new RegExp(`export.*${escapeRegex(searchTerm.value)}`, 'gi'), // Export statements
            ];

            // Base n8n patterns
            const basePatterns = [
              new RegExp(`\\b${escapeRegex(searchTerm.value)}\\b`, 'gi'),
              new RegExp(`\\$\\(['"]${escapeRegex(searchTerm.value)}['"]\\)`, 'gi'),
              new RegExp(`\\$node\\[['"]${escapeRegex(searchTerm.value)}['"]\\]`, 'gi'),
              new RegExp(`\\$json\\.${escapeRegex(searchTerm.value)}`, 'gi'),
              new RegExp(`${escapeRegex(searchTerm.value)}\\.[\\w.\\[\\]]+`, 'gi'),
              new RegExp(`\\.[\\w.]*${escapeRegex(searchTerm.value)}[\\w.]*`, 'gi'),
              new RegExp(`\\$\\(${escapeRegex(searchTerm.value)}\\)`, 'gi'),
              new RegExp(`\\{\\{[^}]*${escapeRegex(searchTerm.value)}[^}]*\\}\\}`, 'gi'),
              new RegExp(`\\$\\{${escapeRegex(searchTerm.value)}\\}`, 'gi'),
              new RegExp(`\\$json\\..*${escapeRegex(searchTerm.value)}.*`, 'gi'),
              new RegExp(`\\$items\\[[^\\]]*\\].*${escapeRegex(searchTerm.value)}.*`, 'gi'),
              new RegExp(`\\$input.*${escapeRegex(searchTerm.value)}.*`, 'gi'),
            ];

            // For code nodes, try JS patterns first for better context, then fallback to base patterns
            // For other nodes, use base patterns first
            const searchPatterns = isCodeNode ? [...jsPatterns, ...basePatterns] : [...basePatterns, ...jsPatterns];

            // Keep track of matches to avoid duplicates
            const foundMatches = new Set<string>();

            searchPatterns.forEach((pattern, patternIndex) => {
              const matches_in_string = value.match(pattern);
              if (matches_in_string) {
                // For code nodes, try to extract line context
                let context = `Node: ${node.name}`;
                let enhancedExpression = value;
                let matchKey = `${currentPath}-${value}`;

                if (isCodeNode && value.length > 100) {
                  // Split into lines to find the matching line
                  const lines = value.split('\n');
                  const matchingLines = lines.filter(line => pattern.test(line));

                  if (matchingLines.length > 0) {
                    const bestMatch = matchingLines[0].trim();
                    const lineNumber = lines.findIndex(line => pattern.test(line)) + 1;

                    enhancedExpression = bestMatch;
                    context = `Code Node: ${node.name} (Line ${lineNumber})`;
                    matchKey = `${currentPath}-${bestMatch}`;
                  }
                }

                // Only add if we haven't found this exact match before
                if (!foundMatches.has(matchKey)) {
                  foundMatches.add(matchKey);

                  matches.push({
                    field: currentPath,
                    expression: enhancedExpression,
                    fullValue: value,
                    context,
                    matchIndex: matchIndex++
                  });

                  // For code nodes, if we found a good JS match, skip the basic patterns to avoid duplicates
                  if (isCodeNode && patternIndex < jsPatterns.length && enhancedExpression !== value) {
                    return; // Skip remaining patterns for this value
                  }
                }
              }
            });
          } else if (typeof value === 'object' && value !== null) {
            searchInObject(value as Record<string, unknown>, currentPath);
          }
        });
      };

      searchInObject(node.parameters, 'parameters');
      if (node.credentials) {
        searchInObject(node.credentials, 'credentials');
      }

      if (matches.length > 0) {
        results.push({
          nodeName: node.name,
          nodeType: node.type,
          nodeId: node.id,
          matches
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: { results }
    });

  } catch (error) {
    console.error('Search variable error:', error);
    return NextResponse.json({
      success: false,
      error: `Error searching variables: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
