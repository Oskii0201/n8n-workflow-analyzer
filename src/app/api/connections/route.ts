import { NextResponse } from 'next/server'
import { getAuthContext } from '@/src/lib/auth-helpers'
import { encrypt } from '@/src/lib/encryption'
import { requireString, requireUrl } from '@/src/lib/validation'
import { rateLimit } from '@/src/lib/rate-limit'

// GET - List all connections for current user
export async function GET(request: Request) {
  try {
    const limit = rateLimit(request, 'connections:get', { limit: 120, windowMs: 60_000 })
    if (!limit.ok) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }
    const { user, supabase } = await getAuthContext()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('n8n_connections')
      .select('id, name, base_url, description, is_active, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST - Create new connection
export async function POST(request: Request) {
  try {
    const limit = rateLimit(request, 'connections:post', { limit: 30, windowMs: 60_000 })
    if (!limit.ok) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      )
    }
    const { user, supabase } = await getAuthContext()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name = requireString(body?.name, 'name', { minLength: 1, trim: true })
    const baseUrl = requireUrl(body?.base_url, 'base_url')
    const apiKey = requireString(body?.api_key, 'api_key', { minLength: 1, trim: true })
    const description =
      body?.description !== undefined
        ? requireString(body.description, 'description', { trim: true })
        : null

    if (!name.ok || !baseUrl.ok || !apiKey.ok) {
      let error = 'Invalid request'
      if (!name.ok) {
        error = name.error
      } else if (!baseUrl.ok) {
        error = baseUrl.error
      } else if (!apiKey.ok) {
        error = apiKey.error
      }
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    // Encrypt API key server-side
    const encrypted_api_key = encrypt(apiKey.value)

    // Check if this should be the first active connection
    const { count } = await supabase
      .from('n8n_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const is_active = count === 0 // First connection is active by default

    const { data, error } = await supabase
      .from('n8n_connections')
      .insert({
        user_id: user.id,
        name: name.value,
        base_url: baseUrl.value,
        encrypted_api_key,
        description: description?.ok ? description.value : null,
        is_active,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
