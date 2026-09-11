import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { fetchEngagementContextMap, EMPTY_ENGAGEMENT_CONTEXT } from './engagementContext'
import { fetchClientIdentityMap } from './clientNodeIdentity'
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
        // Démo par utilisateur : réel OU fiche de démo qui m'appartient.
        .or(`is_demo.eq.false,demo_owner_id.eq.${profile.id}`)
        .abortSignal(abortController.signal)
      if (abortController.signal.aborted) return
      if (queryError || !data) {
        console.error('useCabinetClients:', queryError?.message)
        setError('Impossible de charger les clients.')
        setLoading(false)
        return
      }
      // Identité (RFC 0007 P1c.2, nœud organizations) + contexte (P1b, engagement_profiles).
      const orgIds = data.map((c) => c.client_org_id)
      const [idMap, ctxMap] = await Promise.all([
        fetchClientIdentityMap(orgIds, abortController.signal),
        fetchEngagementContextMap(cabinetId, orgIds, abortController.signal),
      ])
      if (abortController.signal.aborted) return
      const merged = data.map((c) => ({
        ...EMPTY_ENGAGEMENT_CONTEXT, ...c,
        ...(c.client_org_id ? idMap.get(c.client_org_id) : undefined),
        ...(c.client_org_id ? ctxMap.get(c.client_org_id) : undefined),
      }))
      merged.sort((a, b) => (a.client_name ?? '').localeCompare(b.client_name ?? ''))
      setClients(merged)
      setLoading(false)
    })()

    return () => abortController.abort()
  }, [profile?.organization_id, profile?.id, refreshKey])

  return { clients, loading, error, refetch }
}
