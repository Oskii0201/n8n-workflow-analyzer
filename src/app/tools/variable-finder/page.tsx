import { getAuthContext } from '@/src/lib/auth-helpers'
import { redirect } from 'next/navigation'
import N8NVariableFinder from '@/src/components/N8NVariableFinder'

export default async function VariableFinderPage() {
  const { user } = await getAuthContext()

  if (!user) {
    redirect('/auth/login')
  }

  return <N8NVariableFinder />
}
