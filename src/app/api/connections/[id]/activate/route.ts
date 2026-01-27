import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/src/lib/auth-helpers'
import { requireString } from '@/src/lib/validation'
import { rateLimit } from '@/src/lib/rate-limit'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const limit = rateLimit(request, 'connections:activate', { limit: 30, windowMs: 60_000 })
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

    // Activate selected connection (DB trigger ensures single active connection)
    const { data, error } = await supabase
      .from('n8n_connections')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', connectionId.value)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
