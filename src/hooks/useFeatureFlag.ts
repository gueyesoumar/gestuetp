import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Lit l'état global d'un feature flag par son slug.
 *
 * Phase 2 : flag global on/off uniquement. Le résultat est cached en mémoire
 * pour la durée de la session (les changements admin nécessitent un reload).
 *
 * Usage :
 *   const { enabled, loading } = useFeatureFlag('weekly_digest_email')
 *   if (loading) return null
 *   if (!enabled) return null
 *   ...
 */
export function useFeatureFlag(slug: string): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cached = sessionStorage.getItem(`ff:${slug}`)
    if (cached !== null) {
      setEnabled(cached === 'true')
      setLoading(false)
      return
    }

    const abort = new AbortController()
    void supabase
      .from('feature_flags')
      .select('is_globally_enabled')
      .eq('slug', slug)
      .abortSignal(abort.signal)
      .maybeSingle()
      .then(({ data, error }) => {
        if (abort.signal.aborted) return
        if (error) {
          console.warn(`[useFeatureFlag] ${slug}:`, error.message)
          setEnabled(false)
        } else {
          const value = (data as { is_globally_enabled: boolean } | null)?.is_globally_enabled ?? false
          sessionStorage.setItem(`ff:${slug}`, String(value))
          setEnabled(value)
        }
        setLoading(false)
      })
    return () => abort.abort()
  }, [slug])

  return { enabled, loading }
}
