import { getAuthContext } from '@/src/lib/auth-helpers'
import { redirect } from 'next/navigation'
import WeeklySchedulerClient from './WeeklySchedulerClient'

export default async function WeeklySchedulerPage() {
  const { user } = await getAuthContext()

  if (!user) {
    redirect('/auth/login')
  }

  return <WeeklySchedulerClient />
}
