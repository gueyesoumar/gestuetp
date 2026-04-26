import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface AggCounters {
  total_calls: number
  success_calls: number
  failed_calls: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
  avg_duration_ms: number
}

export interface FunctionStat {
  function_name: string
  calls: number
  success_rate: number
  cost_usd: number
  avg_duration_ms: number
  last_failure_at: string | null
}

export interface CabinetStat {
  organization_id: string
  cabinet_name: string
  calls: number
  cost_usd: number
}

export interface FailureRow {
  id: string
  function_name: string
  model: string | null
  error_message: string | null
  created_at: string
  cabinet_name: string | null
}

export interface CabinetStorage {
  organization_id: string
  cabinet_name: string
  total_bytes: number
  documents_count: number
}

export interface AdminMonitoringStats {
  ai_30d: AggCounters
  ai_7d: AggCounters
  ai_per_function: FunctionStat[]
  ai_per_cabinet: CabinetStat[]
  ai_recent_failures: FailureRow[]
  emails_30d_total: number
  emails_30d_by_type: Array<{ type: string; count: number }>
  storage_per_cabinet: CabinetStorage[]
  storage_total_mb: number
}

interface Result {
  stats: AdminMonitoringStats | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminMonitoring(): Result {
  const [stats, setStats] = useState<AdminMonitoringStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase.functions.invoke('admin-monitoring-stats', { body: {} })
      .then(({ data, error: fnError }) => {
        if (cancelled) return
        if (fnError) {
          setError(fnError.message ?? 'Erreur de chargement')
        } else if (data?.error) {
          setError(data.error)
        } else {
          setStats(data as AdminMonitoringStats)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [tick])

  return { stats, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
