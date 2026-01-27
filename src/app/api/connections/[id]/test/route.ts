import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/src/lib/auth-helpers'
import { resolveConnection } from '@/src/lib/n8n-connection'
import { fetchN8n } from '@/src/lib/n8n-client'
import { requireString } from '@/src/lib/validation'
import { rateLimit } from '@/src/lib/rate-limit'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const limit = rateLimit(request, 'connections:test-id', { limit: 30, windowMs: 60_000 })
    if (!limit.ok) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }
    const { id } = await context.params
    const connectionId = requireString(id, 'id', { minLength: 1, trim: true })
    if (!connectionId.ok) {
      return NextResponse.json({ success: false, error: connectionId.error }, { status: 400 })
    }
    const { user, supabase } = await getAuthContext()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const resolved = await resolveConnection(supabase, user.id, connectionId.value)
    if (!resolved.ok) {
      return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.status })
    }

    const response = await fetchN8n<{ data?: unknown }>(
      `${resolved.baseUrl}/api/v1/workflows?limit=1`,
      resolved.apiKey
    )

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: response.error },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
