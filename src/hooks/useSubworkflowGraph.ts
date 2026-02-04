'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SubworkflowGraph } from '@/src/types/n8n'

export function useSubworkflowGraph(connectionId?: string) {
  const [graph, setGraph] = useState<SubworkflowGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadGraph = useCallback(async () => {
    if (!connectionId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/n8n/subworkflow-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setGraph(data.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load subworkflow graph'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [connectionId])

  useEffect(() => {
    loadGraph()
  }, [loadGraph])

  useEffect(() => {
    if (!connectionId) {
      setGraph(null)
      setLoading(false)
      setError(null)
    }
  }, [connectionId])

  return { graph, loading, error, refresh: loadGraph }
}
