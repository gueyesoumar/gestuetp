import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface ActivityRow {
  id: string
  occurred_at: string
  action: string
  target_type: string | null
  target_id: string | null
  target_label: string | null
  summary: string | null
  metadata: Record<string, unknown>
  source: 'trigger' | 'edge' | 'system'
  actor_user_id: string | null
  actor_label: string | null
  actor: { first_name: string; last_name: string } | null
}

export interface ActivityFilters {
  family: string   // préfixe d'action (ex 'mission'), '' = toutes
  from: string     // date ISO (yyyy-mm-dd), '' = aucune borne
  to: string
}

const PAGE = 50

/** Nom d'affichage de l'acteur : jointure users (source de vérité), repli sur le
 *  snapshot actor_label, sinon « Système ». */
export function actorName(r: ActivityRow): string {
  if (r.actor) return `${r.actor.first_name} ${r.actor.last_name}`.trim()
  return r.actor_label ?? 'Système'
}

/**
 * Piste d'audit de l'organisation courante. La RLS de activity_log cloisonne
 * automatiquement (org + can_view_audit_trail) — aucun filtre org côté client.
 */
export function useActivityLog(filters: ActivityFilters): {
  rows: ActivityRow[]; loading: boolean; error: string | null
  hasMore: boolean; loadMore: () => void; reload: () => void
} {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)

  const fetchPage = useCallback(async (pageIndex: number, signal: AbortSignal): Promise<void> => {
    setLoading(true)
    let q = supabase
      .from('activity_log')
      .select('id, occurred_at, action, target_type, target_id, target_label, summary, metadata, source, actor_user_id, actor_label, actor:users!actor_user_id(first_name, last_name)')
      .order('occurred_at', { ascending: false })
      .range(pageIndex * PAGE, pageIndex * PAGE + PAGE - 1)
    if (filters.family) q = q.like('action', `${filters.family}.%`)
    if (filters.from) q = q.gte('occurred_at', filters.from)
    if (filters.to) q = q.lte('occurred_at', `${filters.to}T23:59:59`)

    const { data, error: qErr } = await q.abortSignal(signal)
    if (signal.aborted) return
    if (qErr) {
      console.error('[useActivityLog]', qErr.message)
      setError('Impossible de charger la piste d’audit.')
      setLoading(false)
      return
    }
    const batch = (data ?? []) as unknown as ActivityRow[]
    setHasMore(batch.length === PAGE)
    setRows((prev) => (pageIndex === 0 ? batch : [...prev, ...batch]))
    setError(null)
    setLoading(false)
  }, [filters.family, filters.from, filters.to])

  useEffect(() => {
    const ac = new AbortController()
    setPage(0)
    void fetchPage(0, ac.signal)
    return () => ac.abort()
  }, [fetchPage])

  const loadMore = useCallback(() => {
    const next = page + 1
    setPage(next)
    const ac = new AbortController()
    void fetchPage(next, ac.signal)
  }, [page, fetchPage])

  const reload = useCallback(() => {
    setPage(0)
    const ac = new AbortController()
    void fetchPage(0, ac.signal)
  }, [fetchPage])

  return { rows, loading, error, hasMore, loadMore, reload }
}
