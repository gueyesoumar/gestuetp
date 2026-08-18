import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Measure } from './useMeasures'

/**
 * Toutes les mesures réglementaires du parc du régulateur courant (lecture seule).
 * La RLS de regulatory_measures (régulateur + sous-arbre) scope automatiquement
 * le résultat — aucun filtre côté client nécessaire.
 */
export function useParkMeasures(): { measures: Measure[]; loading: boolean } {
  const [measures, setMeasures] = useState<Measure[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    supabase
      .from('regulatory_measures')
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) console.error('[useParkMeasures]', error.message)
        setMeasures((data ?? []) as Measure[])
        setLoading(false)
      })
    return () => ac.abort()
  }, [])

  return { measures, loading }
}
