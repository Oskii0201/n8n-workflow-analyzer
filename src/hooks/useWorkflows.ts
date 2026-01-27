'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Workflow } from '@/src/types/n8n'

export function useWorkflows(connectionId?: string) {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWorkflows = useCallback(async () => {
    if (!connectionId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/n8n/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setWorkflows(data.data.workflows)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load workflows'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [connectionId])

  useEffect(() => {
    loadWorkflows()
  }, [loadWorkflows])

  useEffect(() => {
    if (!connectionId) {
      setWorkflows([])
      setLoading(false)
      setError(null)
    }
  }, [connectionId])

  return { workflows, loading, error, refresh: loadWorkflows }
}
