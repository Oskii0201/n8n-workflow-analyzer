import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/src/lib/auth-helpers';
import { resolveConnection } from '@/src/lib/n8n-connection';
import { fetchN8n } from '@/src/lib/n8n-client';
import { requireString } from '@/src/lib/validation';
import { rateLimit } from '@/src/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const limit = rateLimit(request, 'n8n:test-connection', { limit: 30, windowMs: 60_000 })
    if (!limit.ok) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }
    const { user, supabase } = await getAuthContext();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

        const response = await fetchN8n<{ data?: unknown }>(
            `${normalizedUrl}/api/v1/workflows?limit=1`,
            resolved.apiKey
        );

        if (!response.ok) {
            return NextResponse.json(
                { success: false, error: response.error },
                { status: response.status }
            );
        }

        return NextResponse.json({ success: true });
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
