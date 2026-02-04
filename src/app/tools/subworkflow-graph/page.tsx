import { getAuthContext } from '@/src/lib/auth-helpers'
import { redirect } from 'next/navigation'
import SubworkflowGraphClient from '@/src/components/SubworkflowGraphClient'

export default async function SubworkflowGraphPage() {
  const { user } = await getAuthContext()

  if (!user) {
    redirect('/auth/login')
  }

  return <SubworkflowGraphClient />
}
