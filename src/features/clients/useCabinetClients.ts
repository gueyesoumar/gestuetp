import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { fetchEngagementContextMap } from './engagementContext'
import type { CabinetClient } from '../../types/database.types'

interface UseCabinetClientsResult {
  clients: CabinetClient[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useCabinetClients(): UseCabinetClientsResult {
  const { profile } = useAuth()
  const [clients, setClients] = useState<CabinetClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    const cabinetId = profile.organization_id
    void (async () => {
      const { data, error: queryError } = await supabase
        .from('cabinet_clients')
        .select('*')
        .eq('cabinet_id', cabinetId)
        .order('client_name')
        .abortSignal(abortController.signal)
      if (abortController.signal.aborted) return
      if (queryError || !data) {
        console.error('useCabinetClients:', queryError?.message)
        setError('Impossible de charger les clients.')
        setLoading(false)
        return
      }
      // Contexte de mission (RFC 0007 P1b) fusionné depuis engagement_profiles.
      const ctxMap = await fetchEngagementContextMap(cabinetId, data.map((c) => c.client_org_id), abortController.signal)
      if (abortController.signal.aborted) return
      setClients(data.map((c) => ({ ...c, ...(c.client_org_id ? ctxMap.get(c.client_org_id) : undefined) })))
      setLoading(false)
    })()

    return () => abortController.abort()
  }, [profile?.organization_id, refreshKey])

  return { clients, loading, error, refetch }
}
