import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
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

    supabase
      .from('cabinet_clients')
      .select('*')
      .eq('id', clientId)
      .single()
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useCabinetClientDetail:', queryError.message)
          setError('Client introuvable.')
        } else {
          setClient(data)
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [clientId, refreshKey])

  return { client, loading, error, refetch }
}
