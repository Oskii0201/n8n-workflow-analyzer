'use client'

import { useCallback, useState } from 'react'

type ScheduleEvent = {
  id: string
  title: string
  start: string
  end: string
  workflowId: string
  cron: string
  averageDurationMs: number | null
}

type ScheduleResponse = {
  events: ScheduleEvent[]
  timeZone?: string
}

export function useWeeklyScheduler() {
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (params: {
      connectionId?: string
      timeZone?: string
      rangeStart?: string
      rangeEnd?: string
    }) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/n8n/schedules/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load schedules')
      }

      const payload = data.data as ScheduleResponse
      setEvents(payload.events || [])
      return { success: true, data: payload }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load schedules'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [])

  return { events, loading, error, load }
}
