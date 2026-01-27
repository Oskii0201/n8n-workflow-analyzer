import { createClient } from './supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Gets the authenticated user and Supabase client
 * @returns Object containing user (or null) and supabase client
 */
export async function getAuthContext() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null, supabase }
  }

  return { user, supabase }
}

/**
 * Requires authentication, throws error if not authenticated
 * @returns Authenticated user object
 * @throws Error if user is not authenticated
 */
export async function requireAuth(): Promise<User> {
  const { user } = await getAuthContext()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}
