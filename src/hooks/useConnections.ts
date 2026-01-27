'use client'

import { useState, useEffect, useCallback } from 'react'
import type { N8nConnection } from '@/src/types/database'

export function useConnections(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const [connections, setConnections] = useState<N8nConnection[]>([])
  const [loading, setLoading] = useState(true) // Start with loading=true
  const [error, setError] = useState<string | null>(null)

  const loadConnections = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/connections')
      const data = await response.json()

      if (!response.ok) throw new Error(data.error)

      setConnections(data.data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load connections'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [enabled])

  const addConnection = useCallback(async (connection: {
    name: string
    base_url: string
    api_key: string
    description?: string
  }) => {
    try {
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connection),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      await loadConnections() // Refresh list
      return { success: true, data: data.data }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add connection'
      return { success: false, error: message }
    }
  }, [loadConnections])

  const deleteConnection = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/connections/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      await loadConnections()
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete connection'
      return { success: false, error: message }
    }
  }, [loadConnections])

  const activateConnection = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/connections/${id}/activate`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to activate')

      await loadConnections()
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to activate connection'
      return { success: false, error: message }
    }
  }, [loadConnections])

  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  useEffect(() => {
    if (!enabled) {
      setConnections([])
      setError(null)
    }
  }, [enabled])

  const activeConnection = connections.find(c => c.is_active)

  return {
    connections,
    activeConnection,
    loading,
    error,
    refresh: loadConnections,
    addConnection,
    deleteConnection,
    activateConnection,
  }
}
