import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface AuditLogRow {
  id: string
  action: string
  target_type: string
  target_id: string | null
  reason: string
  metadata: Record<string, unknown> | null
  created_at: string
  actor_email: string
  actor_first_name: string
  actor_last_name: string
}

interface Filters {
  action?: string | null
  actorId?: string | null
  sinceDays?: number
}

interface Result {
  rows: AuditLogRow[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminAuditLog(filters: Filters): Result {
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const filterKey = `${filters.action ?? ''}|${filters.actorId ?? ''}|${filters.sinceDays ?? 30}`

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError(null)

    const since = new Date(Date.now() - (filters.sinceDays ?? 30) * 86_400_000).toISOString()
    let q = supabase
      .from('admin_audit_log')
      .select('id, action, target_type, target_id, reason, metadata, created_at, actor:users!admin_audit_log_actor_id_fkey(email, first_name, last_name)')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)

    if (filters.action) q = q.eq('action', filters.action)
    if (filters.actorId) q = q.eq('actor_id', filters.actorId)

    q.abortSignal(abort.signal).then(({ data, error: queryError }) => {
      if (abort.signal.aborted) return
      if (queryError) {
        console.error('useAdminAuditLog:', queryError.message)
        setError('Chargement impossible')
      } else {
        const items = (data ?? []) as Array<Record<string, unknown> & { actor: { email: string; first_name: string; last_name: string } | null }>
        setRows(items.map((r) => ({
          id: r.id as string,
          action: r.action as string,
          target_type: r.target_type as string,
          target_id: r.target_id as string | null,
          reason: r.reason as string,
          metadata: r.metadata as Record<string, unknown> | null,
          created_at: r.created_at as string,
          actor_email: r.actor?.email ?? '—',
          actor_first_name: r.actor?.first_name ?? '—',
          actor_last_name: r.actor?.last_name ?? '',
        })))
      }
      setLoading(false)
    })

    return () => abort.abort()
  }, [filterKey, tick])

  return { rows, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
