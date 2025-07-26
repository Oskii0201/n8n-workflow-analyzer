import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { apiKey, baseUrl } = await request.json();

        if (!apiKey || !baseUrl || !id) {
            return NextResponse.json(
                { success: false, error: 'API Key, Base URL and Workflow ID are required' },
                { status: 400 }
            );
        }

        const normalizedUrl = baseUrl.replace(/\/$/, '');

        const response = await fetch(`${normalizedUrl}/api/v1/workflows/${id}`, {
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
        const workflow = workflowResponse.data;

        const analysisData = {
            id: workflow.id,
            name: workflow.name,
            nodes: workflow.nodes || [],
            connections: workflow.connections || {},
            settings: workflow.settings || {},
            active: workflow.active,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt
        };

        return NextResponse.json({
            success: true,
            data: { workflow: analysisData }
        });
    } catch (error) {
        console.error('Workflow details fetch error:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Error fetching workflow details: ${error instanceof Error ? error.message : 'Unknown error'}`
            },
            { status: 500 }
        );
    }
}