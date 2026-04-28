import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

/**
 * Stats résumées affichées sur la carte Comply du Hub :
 *   - activeMissions : nb missions du cabinet non clôturées
 *   - totalControls  : nb total de control_assessments sur ces missions
 *   - conformityScore : approved / total * 100 (même formule que close-mission)
 *
 * Volontairement plus léger que useDashboardStats : on ne charge que les
 * 2 tables nécessaires pour ne pas ralentir le hub.
 */

export interface ComplyHubStats {
  activeMissions: number
  totalControls: number
  /** null si aucun contrôle évalué — on affichera "—" plutôt que "0%" */
  conformityScore: number | null
}

interface UseComplyHubStatsResult {
  stats: ComplyHubStats
  loading: boolean
}

const EMPTY: ComplyHubStats = { activeMissions: 0, totalControls: 0, conformityScore: null }

export function useComplyHubStats(): UseComplyHubStatsResult {
  const { profile } = useAuth()
  const [stats, setStats] = useState<ComplyHubStats>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.organization_id) {
      setStats(EMPTY)
      setLoading(false)
      return
    }
    const ctrl = new AbortController()

    void (async () => {
      const { data: missionsData, error: mErr } = await supabase
        .from('missions')
        .select('id, status')
        .eq('cabinet_id', profile.organization_id)
        .eq('is_active', true)
        .abortSignal(ctrl.signal)

      if (ctrl.signal.aborted) return
      if (mErr) {
        console.warn('useComplyHubStats missions:', mErr.message)
        setStats(EMPTY)
        setLoading(false)
        return
      }

      const missions = missionsData ?? []
      const activeMissions = missions.filter((m) => m.status !== 'closure').length
      const missionIds = missions.map((m) => m.id)

      if (missionIds.length === 0) {
        setStats({ activeMissions, totalControls: 0, conformityScore: null })
        setLoading(false)
        return
      }

      const { data: assessments, error: aErr } = await supabase
        .from('control_assessments')
        .select('status')
        .in('mission_id', missionIds)
        .abortSignal(ctrl.signal)

      if (ctrl.signal.aborted) return
      if (aErr) {
        console.warn('useComplyHubStats assessments:', aErr.message)
        setStats({ activeMissions, totalControls: 0, conformityScore: null })
        setLoading(false)
        return
      }

      const all = assessments ?? []
      const totalControls = all.length
      const approved = all.filter((a) => a.status === 'approved').length
      const conformityScore = totalControls > 0 ? Math.round((approved / totalControls) * 100) : null

      setStats({ activeMissions, totalControls, conformityScore })
      setLoading(false)
    })()

    return () => ctrl.abort()
  }, [profile?.organization_id])

  return { stats, loading }
}
