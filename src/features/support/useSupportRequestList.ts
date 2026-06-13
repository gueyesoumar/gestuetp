import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { SupportRequest, SupportStatus } from '../../types/database.types'

interface UseSupportRequestList {
  requests: SupportRequest[]
  loading: boolean
  error: string | null
  refetch: () => void
  updateStatus: (id: string, status: SupportStatus) => Promise<boolean>
}

/**
 * Liste des tickets de support visibles par l'utilisateur (RLS : platform owner
 * voit tout, un cabinet voit les siens). Lecture abortable + changement de statut.
 */
export function useSupportRequestList(): UseSupportRequestList {
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    supabase
      .from('support_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(controller.signal)
      .then(({ data, error: queryError }) => {
        if (controller.signal.aborted) return
        if (queryError) {
          console.error('useSupportRequestList:', queryError.message)
          setError('Impossible de charger les demandes.')
        } else {
          setRequests((data ?? []) as SupportRequest[])
        }
        setLoading(false)
      }, () => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [refreshKey])

  const updateStatus = useCallback(async (id: string, status: SupportStatus): Promise<boolean> => {
    const { error: updateError } = await supabase
      .from('support_requests')
      .update({ status })
      .eq('id', id)

    if (updateError) {
      console.error('useSupportRequestList.updateStatus:', updateError.message)
      return false
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
    return true
  }, [])

  return { requests, loading, error, refetch, updateStatus }
}
