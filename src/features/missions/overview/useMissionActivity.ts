import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

/**
 * Activité récente d'une mission : lit la piste d'audit (`activity_log`) pour les
 * événements rattachés à cette mission (cible = mission, ou `metadata.mission_id`).
 * La RLS de `activity_log` cloisonne par organisation + `can_view_audit_trail` :
 * un utilisateur sans ce droit reçoit un jeu vide (le panneau l'affiche alors
 * proprement, sans erreur).
 */
export interface MissionActivityRow {
  id: string
  occurred_at: string
  action: string
  summary: string | null
  actor_label: string | null
  actor: { first_name: string; last_name: string } | null
}

export function useMissionActivity(missionId: string): { rows: MissionActivityRow[]; loading: boolean } {
  const [rows, setRows] = useState<MissionActivityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ac = new AbortController()
    void (async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('id, occurred_at, action, summary, actor_label, actor:users!actor_user_id(first_name, last_name)')
        .or(`target_id.eq.${missionId},metadata->>mission_id.eq.${missionId}`)
        .order('occurred_at', { ascending: false })
        .limit(8)
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) {
        console.error('[useMissionActivity]', error.message)
        setRows([]); setLoading(false); return
      }
      setRows((data ?? []) as unknown as MissionActivityRow[])
      setLoading(false)
    })()
    return () => ac.abort()
  }, [missionId])

  return { rows, loading }
}

/** Nom lisible de l'acteur (jointure users, repli sur snapshot, sinon Système). */
export function missionActorName(r: MissionActivityRow): string {
  if (r.actor) return `${r.actor.first_name} ${r.actor.last_name}`.trim()
  return r.actor_label ?? 'Système'
}

/** Horodatage relatif court en français. */
export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR')
}
