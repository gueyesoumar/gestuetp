import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface AdminStats {
  cabinets_active: number
  cabinets_total: number
  cabinets_suspended: number
  users_active_30d: number
  missions_in_progress: number
  mrr_eur_estimated: number
  alerts: Array<{ kind: 'warn' | 'info' | 'red'; message: string }>
  activity_14d: number[]
}

interface Result {
  stats: AdminStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminStats(): Result {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase.functions.invoke('admin-stats', { body: {} })
      .then(({ data, error: fnError }) => {
        if (cancelled) return
        if (fnError) {
          setError(fnError.message ?? 'Erreur de chargement')
        } else if (data?.error) {
          setError(data.error)
        } else {
          setStats(data as AdminStats)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [tick])

  return { stats, loading, error, refetch: () => setTick((t) => t + 1) }
}
