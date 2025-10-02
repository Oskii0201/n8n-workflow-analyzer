import { NextRequest, NextResponse } from 'next/server';

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
    const { apiKey, baseUrl } = await request.json();

    if (!apiKey || !baseUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: apiKey or baseUrl'
      }, { status: 400 });
    }

    const normalizedUrl = baseUrl.replace(/\/$/, '');

    // Fetch all workflows with pagination
    let allWorkflowsData: Record<string, unknown>[] = [];
    let cursor: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const url = cursor
        ? `${normalizedUrl}/api/v1/workflows?limit=100&cursor=${cursor}`
        : `${normalizedUrl}/api/v1/workflows?limit=100`;

      const response = await fetch(url, {
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

      const data = await response.json();
      allWorkflowsData = allWorkflowsData.concat(data.data || []);

      cursor = data.nextCursor;
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