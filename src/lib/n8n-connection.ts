import { decrypt } from '@/src/lib/encryption'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { N8nConnection } from '@/src/types/database'

type ConnectionRow = Pick<N8nConnection, 'base_url' | 'encrypted_api_key'>

export type ResolvedConnection =
  | { ok: true; baseUrl: string; apiKey: string }
  | { ok: false; status: number; error: string }

export async function resolveConnection(
  supabase: SupabaseClient,
  userId: string,
  connectionId?: string
): Promise<ResolvedConnection> {
  const query = supabase
    .from('n8n_connections')
    .select('base_url, encrypted_api_key')
    .eq('user_id', userId)

  const { data, error } = connectionId
    ? await query.eq('id', connectionId).single()
    : await query.eq('is_active', true).single()

  if (error || !data) {
    const status = connectionId ? 404 : 400
    const message = connectionId ? 'Connection not found' : 'No active connection found'
    return { ok: false, status, error: message }
  }

  const apiKey = decrypt((data as ConnectionRow).encrypted_api_key)
  if (!apiKey) {
    return { ok: false, status: 500, error: 'Failed to decrypt API key' }
  }

  return {
    ok: true,
    baseUrl: (data as ConnectionRow).base_url.replace(/\/$/, ''),
    apiKey,
  }
}
