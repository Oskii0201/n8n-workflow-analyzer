import { createClient } from '@/src/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const loginUrl = new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  return NextResponse.redirect(loginUrl)
}

export async function GET() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const loginUrl = new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  return NextResponse.redirect(loginUrl)
}
