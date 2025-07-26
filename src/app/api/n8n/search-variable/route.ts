import { NextRequest, NextResponse } from 'next/server';

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
    const { apiKey, baseUrl, workflowId, searchTerm } = await request.json();

    if (!apiKey || !baseUrl || !workflowId || !searchTerm) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: apiKey, baseUrl, workflowId, or searchTerm'
      }, { status: 400 });
    }

    const normalizedUrl = baseUrl.replace(/\/$/, '');

    const response = await fetch(`${normalizedUrl}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: response.status }
      );
    }

    const workflowResponse = await response.json();
    const workflow: WorkflowData = workflowResponse.data;

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
            const searchPatterns = [
              new RegExp(`\\b${escapeRegex(searchTerm)}\\b`, 'gi'),
              new RegExp(`\\$\\(['"]${escapeRegex(searchTerm)}['"]\\)`, 'gi'),
              new RegExp(`\\$node\\[['"]${escapeRegex(searchTerm)}['"]\\]`, 'gi'),
              new RegExp(`\\$json\\.${escapeRegex(searchTerm)}`, 'gi'),
              new RegExp(`${escapeRegex(searchTerm)}\\.[\\w.\\[\\]]+`, 'gi'),
              new RegExp(`\\.[\\w.]*${escapeRegex(searchTerm)}[\\w.]*`, 'gi'),
              new RegExp(`\\$\\(${escapeRegex(searchTerm)}\\)`, 'gi'),
              new RegExp(`\\{\\{[^}]*${escapeRegex(searchTerm)}[^}]*\\}\\}`, 'gi'),
              new RegExp(`\\$\\{${escapeRegex(searchTerm)}\\}`, 'gi'),
              new RegExp(`\\$json\\..*${escapeRegex(searchTerm)}.*`, 'gi'),
              new RegExp(`\\$items\\[[^\\]]*\\].*${escapeRegex(searchTerm)}.*`, 'gi'),
              new RegExp(`\\$input.*${escapeRegex(searchTerm)}.*`, 'gi'),
            ];

            searchPatterns.forEach(pattern => {
              const matches_in_string = value.match(pattern);
              if (matches_in_string) {
                matches.push({
                  field: currentPath,
                  expression: value,
                  fullValue: value,
                  context: `Node: ${node.name}`,
                  matchIndex: matchIndex++
                });
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