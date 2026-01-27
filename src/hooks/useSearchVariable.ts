'use client'

import { useState, useCallback } from 'react'
import type { SearchResult } from '@/src/types/n8n'

export function useSearchVariable() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (params: {
    connectionId?: string
    workflowId: string
    searchTerm: string
  }) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/n8n/search-variable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setResults(data.data.results)
      return { success: true, data: data.data.results }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Search failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setLoading(false)
    }
  }, [])

  return { results, loading, error, search }
}
