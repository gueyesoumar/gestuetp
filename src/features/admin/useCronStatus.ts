import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/** État des tâches planifiées (pg_cron) — watchdog super-admin (RPC admin_cron_status). */
export interface CronJob {
  jobname: string
  schedule: string
  active: boolean
  last_run_at: string | null
  last_status: string | null
  last_duration_ms: number | null
}

export function useCronStatus(): { jobs: CronJob[]; loading: boolean; error: string | null } {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data, error: rpcError } = await supabase.rpc('admin_cron_status')
      if (cancelled) return
      if (rpcError) {
        console.error('[useCronStatus]', rpcError.message)
        setError('Statut des tâches indisponible')
        setLoading(false)
        return
      }
      setJobs((data ?? []) as CronJob[])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  return { jobs, loading, error }
}
