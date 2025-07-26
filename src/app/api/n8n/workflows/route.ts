import { NextRequest, NextResponse } from 'next/server';

interface N8NWorkflow {
    id: string;
    name: string;
    active: boolean;
    nodes?: any[];
    updatedAt: string;
    createdAt: string;
    tags?: string[];
}

interface N8NWorkflowsResponse {
    data: N8NWorkflow[];
    nextCursor?: string;
}

export async function POST(request: NextRequest) {
    try {
        const { apiKey, baseUrl } = await request.json();

        if (!apiKey || !baseUrl) {
            return NextResponse.json(
                { success: false, error: 'API Key i Base URL są wymagane' },
                { status: 400 }
            );
        }

        const normalizedUrl = baseUrl.replace(/\/$/, '');

        const response = await fetch(`${normalizedUrl}/api/v1/workflows`, {
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

        const data: N8NWorkflowsResponse = await response.json();

        // Formatuj dane dla frontendu
        const workflows = data.data.map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
            active: workflow.active,
            nodes: workflow.nodes?.length || 0,
            updatedAt: workflow.updatedAt,
            createdAt: workflow.createdAt,
            tags: workflow.tags || []
        }));

        // Sortuj workflows - aktywne najpierw, potem według daty aktualizacji
        workflows.sort((a, b) => {
            if (a.active && !b.active) return -1;
            if (!a.active && b.active) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        return NextResponse.json({
            success: true,
            data: { workflows }
        });
    } catch (error) {
        console.error('Workflows fetch error:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Error fetching workflows: ${error instanceof Error ? error.message : 'Unknown error'}`
            },
            { status: 500 }
        );
    }
}