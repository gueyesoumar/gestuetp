import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

/**
 * Contrôles exclus du périmètre d'une mission (mission_exclusions), scopés par la
 * RLS. Permet au gate et au programme de travail d'ignorer ces contrôles, en
 * cohérence avec le RPC serveur transition_mission_to_fieldwork (mig 00372).
 */
export function useMissionExclusions(missionId: string | undefined): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!missionId) { setIds(new Set()); return }
    const ac = new AbortController()

    const load = async (): Promise<void> => {
      const { data, error } = await supabase
        .from('mission_exclusions')
        .select('control_id')
        .eq('mission_id', missionId)
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) { console.error('[useMissionExclusions]', error.message); return }
      setIds(new Set((data ?? []).map((r) => r.control_id as string)))
    }

    void load()
    return () => ac.abort()
  }, [missionId])

  return ids
}
