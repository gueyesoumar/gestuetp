import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Nombre de constats (assessment_findings) d'une mission, à partir des ids
 * d'assessments déjà chargés et scopés (auditeur restreint = ses contrôles).
 * Toutes classifications confondues (major/minor/observation/strength), cohérent
 * avec la dimension « constats » de la Revue. RLS existante, aucune élévation.
 * Retourne null tant que non chargé.
 */
export function useMissionFindingsCount(assessmentIds: string[]): number | null {
  const [count, setCount] = useState<number | null>(null)
  const key = assessmentIds.join(',')

  useEffect(() => {
    const ids = key ? key.split(',') : []
    if (ids.length === 0) { setCount(0); return }
    const ac = new AbortController()

    const load = async (): Promise<void> => {
      const { count: c, error } = await supabase
        .from('assessment_findings')
        .select('id', { count: 'exact', head: true })
        .in('assessment_id', ids)
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) { console.error('[useMissionFindingsCount]', error.message); return }
      setCount(c ?? 0)
    }

    void load()
    return () => ac.abort()
  }, [key])

  return count
}
