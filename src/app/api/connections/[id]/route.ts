import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/src/lib/auth-helpers'
import { encrypt } from '@/src/lib/encryption'
import { requireString, requireUrl } from '@/src/lib/validation'
import { rateLimit } from '@/src/lib/rate-limit'

// GET - Get single connection
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const limit = rateLimit(request, 'connections:get-id', { limit: 120, windowMs: 60_000 })
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

    const { data, error } = await supabase
      .from('n8n_connections')
      .select('id, name, base_url, description, is_active, created_at, updated_at')
      .eq('id', connectionId.value)
      .eq('user_id', user.id)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// PUT - Update connection
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const limit = rateLimit(request, 'connections:put', { limit: 60, windowMs: 60_000 })
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

    const body = await request.json()
    const name =
      body?.name !== undefined
        ? requireString(body.name, 'name', { minLength: 1, trim: true })
        : null
    const baseUrl =
      body?.base_url !== undefined
        ? requireUrl(body.base_url, 'base_url')
        : null
    const apiKey =
      body?.api_key !== undefined
        ? requireString(body.api_key, 'api_key', { minLength: 1, trim: true })
        : null
    const description =
      body?.description !== undefined
        ? requireString(body.description, 'description', { trim: true })
        : null

    if (name && !name.ok) {
      return NextResponse.json({ success: false, error: name.error }, { status: 400 })
    }
    if (baseUrl && !baseUrl.ok) {
      return NextResponse.json({ success: false, error: baseUrl.error }, { status: 400 })
    }
    if (apiKey && !apiKey.ok) {
      return NextResponse.json({ success: false, error: apiKey.error }, { status: 400 })
    }
    if (description && !description.ok) {
      return NextResponse.json({ success: false, error: description.error }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (name) updateData.name = name.value
    if (baseUrl) updateData.base_url = baseUrl.value
    if (apiKey) updateData.encrypted_api_key = encrypt(apiKey.value)
    if (description) updateData.description = description.value

    const { data, error } = await supabase
      .from('n8n_connections')
      .update(updateData)
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

// DELETE - Delete connection
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const limit = rateLimit(request, 'connections:delete', { limit: 30, windowMs: 60_000 })
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

    const { error } = await supabase
      .from('n8n_connections')
      .delete()
      .eq('id', connectionId.value)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An error occurred'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
