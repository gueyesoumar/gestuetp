import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
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

    supabase
      .from('cabinet_clients')
      .select('*')
      .eq('cabinet_id', profile.organization_id)
      .order('client_name')
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useCabinetClients:', queryError.message)
          setError('Impossible de charger les clients.')
        } else {
          setClients(data ?? [])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [profile?.organization_id, refreshKey])

  return { clients, loading, error, refetch }
}
