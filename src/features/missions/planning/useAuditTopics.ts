import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { AuditTopic } from '../../../types/database.types'

export interface AuditTopicWithControls extends AuditTopic {
  control_ids: string[]
}

interface UseAuditTopicsResult {
  topics: AuditTopicWithControls[]
  loading: boolean
  error: string | null
  refetch: () => void
}

// Charge tous les sujets d'un referentiel (templates) + ceux specifiques a la
// mission (customs), avec la liste des control_ids couverts.
export function useAuditTopics(
  frameworkId: string | null | undefined,
  missionId?: string | null
): UseAuditTopicsResult {
  const [topics, setTopics] = useState<AuditTopicWithControls[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!frameworkId) { setTopics([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      let query = supabase
        .from('audit_topics')
        .select('id, framework_id, mission_id, name, description, is_active, sort_order, default_questions, created_at, updated_at')
        .eq('is_active', true)
        .order('sort_order')

      query = missionId
        ? query.or(`framework_id.eq.${frameworkId},mission_id.eq.${missionId}`)
        : query.eq('framework_id', frameworkId)

      const { data: topicRows, error: tErr } = await query.abortSignal(ac.signal)

      if (ac.signal.aborted) return
      if (tErr) {
        console.error('[useAuditTopics] topics:', tErr.message)
        setError('Erreur lors du chargement des sujets')
        setLoading(false)
        return
      }

      const rows = (topicRows ?? []) as AuditTopic[]
      if (rows.length === 0) {
        setTopics([])
        setLoading(false)
        return
      }

      const ids = rows.map((r) => r.id)
      const { data: links, error: lErr } = await supabase
        .from('topic_controls')
        .select('topic_id, control_id')
        .in('topic_id', ids)
        .abortSignal(ac.signal)

      if (ac.signal.aborted) return
      if (lErr) {
        console.error('[useAuditTopics] topic_controls:', lErr.message)
        setError('Erreur lors du chargement des contrôles couverts')
        setLoading(false)
        return
      }

      const byTopic = new Map<string, string[]>()
      for (const link of (links ?? []) as Array<{ topic_id: string; control_id: string }>) {
        const list = byTopic.get(link.topic_id) ?? []
        list.push(link.control_id)
        byTopic.set(link.topic_id, list)
      }

      setTopics(rows.map((r) => ({ ...r, control_ids: byTopic.get(r.id) ?? [] })))
      setLoading(false)
    })()

    return () => ac.abort()
  }, [frameworkId, missionId, tick])

  return { topics, loading, error, refetch }
}
