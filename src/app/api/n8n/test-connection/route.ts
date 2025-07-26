import { NextRequest, NextResponse } from 'next/server';

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

        if (response.ok) {
            return NextResponse.json({ success: true });
        } else {
            const errorText = await response.text();
            let errorMessage = `N8N API Error: ${response.status}`;

            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorMessage;
            } catch {
                errorMessage = errorText || errorMessage;
            }

            return NextResponse.json(
                { success: false, error: errorMessage },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Connection test error:', error);
        return NextResponse.json(
            {
                success: false,
                error: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
            },
            { status: 500 }
        );
    }
}
