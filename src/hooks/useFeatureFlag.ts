import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Lit l'état effectif d'un feature flag pour l'utilisateur courant.
 *
 * Résolution à 2 niveaux :
 *   1. Override pour l'organisation du user (table feature_flag_overrides)
 *   2. Sinon → is_globally_enabled de feature_flags
 *
 * Cache : sessionStorage clé `ff:${orgId}:${slug}` pour éviter de re-requêter
 * à chaque navigation. L'admin invalide le cache via sessionStorage.removeItem
 * lorsqu'il toggle un override.
 *
 * Usage :
 *   const { enabled, loading, source } = useFeatureFlag('weekly_digest_email')
 *   if (loading) return null
 *   if (!enabled) return null
 */
export interface FeatureFlagState {
  enabled: boolean
  loading: boolean
  /** D'où vient la valeur : 'override' (cabinet) ou 'global' (défaut). */
  source: 'override' | 'global' | null
}

export function useFeatureFlag(slug: string): FeatureFlagState {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [state, setState] = useState<FeatureFlagState>({ enabled: false, loading: true, source: null })

  useEffect(() => {
    // Sans profil chargé, on attend
    if (!orgId) {
      setState({ enabled: false, loading: !profile, source: null })
      return
    }

    const cacheKey = `ff:${orgId}:${slug}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { enabled: boolean; source: 'override' | 'global' }
        setState({ enabled: parsed.enabled, loading: false, source: parsed.source })
        return
      } catch {
        // cache corrompu — on ré-interroge
      }
    }

    const abort = new AbortController()
    void (async () => {
      // 1. Charger le flag global
      const { data: flag, error: flagError } = await supabase
        .from('feature_flags')
        .select('id, is_globally_enabled')
        .eq('slug', slug)
        .abortSignal(abort.signal)
        .maybeSingle()

      if (abort.signal.aborted) return
      if (flagError || !flag) {
        console.warn(`[useFeatureFlag] ${slug}:`, flagError?.message ?? 'flag introuvable')
        setState({ enabled: false, loading: false, source: null })
        return
      }
      const f = flag as { id: string; is_globally_enabled: boolean }

      // 2. Chercher un override pour l'org du user
      const { data: override } = await supabase
        .from('feature_flag_overrides')
        .select('enabled')
        .eq('flag_id', f.id)
        .eq('organization_id', orgId)
        .abortSignal(abort.signal)
        .maybeSingle()

      if (abort.signal.aborted) return
      const ov = override as { enabled: boolean } | null
      const enabled = ov?.enabled ?? f.is_globally_enabled
      const source: 'override' | 'global' = ov ? 'override' : 'global'

      sessionStorage.setItem(cacheKey, JSON.stringify({ enabled, source }))
      setState({ enabled, loading: false, source })
    })()

    return () => abort.abort()
  }, [slug, orgId, profile])

  return state
}
