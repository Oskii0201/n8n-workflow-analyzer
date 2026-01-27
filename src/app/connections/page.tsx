import { getAuthContext } from '@/src/lib/auth-helpers'
import { redirect } from 'next/navigation'
import ConnectionsClient from './ConnectionsClient'

export default async function ConnectionsPage() {
  const { user } = await getAuthContext()

  if (!user) {
    redirect('/auth/login')
  }

  return <ConnectionsClient />
}
