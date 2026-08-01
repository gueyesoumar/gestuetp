import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { SupportRequest } from '../../types/database.types'

interface UseMySupportRequests {
  requests: SupportRequest[]
  loading: boolean
  error: string | null
}

/**
 * Tickets soumis PAR l'utilisateur courant (toutes natures), en lecture seule.
 * Le filtre requester_user_id n'est pas une frontiere de securite (la RLS reste
 * cablee au cabinet) mais evite qu'un membre voie les tickets de ses collegues
 * (ex: une trace de reproduction de bug). Lecture abortable.
 */
export function useMySupportRequests(userId: string | undefined): UseMySupportRequests {
  const [requests, setRequests] = useState<SupportRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    supabase
      .from('support_requests')
      .select('*')
      .eq('requester_user_id', userId)
      .order('created_at', { ascending: false })
      .abortSignal(controller.signal)
      .then(({ data, error: queryError }) => {
        if (controller.signal.aborted) return
        if (queryError) {
          console.error('useMySupportRequests:', queryError.message)
          setError('Impossible de charger vos demandes.')
        } else {
          setRequests((data ?? []) as SupportRequest[])
        }
        setLoading(false)
      }, () => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [userId])

  return { requests, loading, error }
}
