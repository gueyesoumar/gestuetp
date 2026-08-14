import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ActivityRow, ActivityFilters } from './useActivityLog'

// Familles portées par le registre probant (probative_log.action_type).
const PROBATIVE_FAMILIES = new Set(['measure', 'incident'])
const CAP = 200

const SUMMARY: Record<string, string> = {
  'measure.issued': 'Mesure émise',
  'measure.escalated': 'Mesure escaladée',
  'measure.status_changed': 'Statut de mesure modifié',
  'incident.declared': 'Incident déclaré',
  'incident.status_changed': "Statut d'incident modifié",
  'incident.notified': 'Incident notifié',
}

interface ProbativeDbRow {
  id: string
  occurred_at: string
  action_type: string
  subject_type: string | null
  subject_id: string | null
  actor_user_id: string | null
  actor: { first_name: string; last_name: string } | null
}

/**
 * Événements du registre probant (probative_log) mappés au format timeline, en
 * LECTURE SEULE, pour agrégation dans la piste d'audit. La RLS de probative_log
 * (staff régulateur + sous-arbre) cloisonne déjà — aucun filtre org côté client.
 * Vide pour une org sans actes réglementaires (Comply). Faible volumétrie → un
 * seul lot plafonné, mergé côté page avec les entrées activity_log.
 */
export function useProbativeEvents(filters: ActivityFilters): { rows: ActivityRow[]; loading: boolean } {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Le registre probant ne porte que les familles measure/incident : si un
    // filtre de famille hors de ce périmètre est actif, rien à agréger.
    if (filters.family && !PROBATIVE_FAMILIES.has(filters.family)) {
      setRows([]); setLoading(false)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    let q = supabase
      .from('probative_log')
      .select('id, occurred_at, action_type, subject_type, subject_id, actor_user_id, actor:users!actor_user_id(first_name, last_name)')
      .order('occurred_at', { ascending: false })
      .limit(CAP)
    if (filters.family) q = q.like('action_type', `${filters.family}.%`)
    if (filters.from) q = q.gte('occurred_at', filters.from)
    if (filters.to) q = q.lte('occurred_at', `${filters.to}T23:59:59`)

    q.abortSignal(ac.signal).then(({ data, error }) => {
      if (ac.signal.aborted) return
      if (error) {
        // Non bloquant : une org non-Regul (ou RLS) renvoie simplement rien.
        console.warn('[useProbativeEvents]', error.message)
        setRows([]); setLoading(false)
        return
      }
      const mapped = ((data ?? []) as unknown as ProbativeDbRow[]).map((r): ActivityRow => ({
        id: `prob-${r.id}`,
        occurred_at: r.occurred_at,
        action: r.action_type,
        target_type: r.subject_type,
        target_id: r.subject_id,
        target_label: null,
        summary: SUMMARY[r.action_type] ?? r.action_type,
        metadata: {},
        source: 'probative',
        actor_user_id: r.actor_user_id,
        actor_label: null,
        actor: r.actor,
      }))
      setRows(mapped); setLoading(false)
    })
    return () => ac.abort()
  }, [filters.family, filters.from, filters.to])

  return { rows, loading }
}
