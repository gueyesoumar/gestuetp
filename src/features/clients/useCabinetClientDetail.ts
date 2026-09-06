import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { fetchEngagementContext } from './engagementContext'
import type { CabinetClient } from '../../types/database.types'

interface UseCabinetClientDetailResult {
  client: CabinetClient | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useCabinetClientDetail(clientId: string | undefined): UseCabinetClientDetailResult {
  const [client, setClient] = useState<CabinetClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!clientId) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      const { data, error: queryError } = await supabase
        .from('cabinet_clients')
        .select('*')
        .eq('id', clientId)
        .abortSignal(abortController.signal)
        .single()
      if (abortController.signal.aborted) return
      if (queryError || !data) {
        console.error('useCabinetClientDetail:', queryError?.message)
        setError('Client introuvable.')
        setLoading(false)
        return
      }
      // Contexte de mission (RFC 0007 P1b) fusionné depuis engagement_profiles.
      const ctx = await fetchEngagementContext(data.cabinet_id, data.client_org_id, abortController.signal)
      if (abortController.signal.aborted) return
      setClient({ ...data, ...(ctx ?? {}) })
      setLoading(false)
    })()

    return () => abortController.abort()
  }, [clientId, refreshKey])

  return { client, loading, error, refetch }
}
