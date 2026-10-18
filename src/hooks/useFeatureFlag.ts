import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Lit l'état effectif d'un feature flag pour l'utilisateur courant.
 *
 * Résolution unifiée (RFC 0018 Phase 1) : les fonctionnalités sont des entitlements
 * `feature.<slug>` dans org_entitlements (même pile que hasCapability). Le RPC
 * `my_features()` renvoie les fonctionnalités actives de l'org du caller ; le kill-switch
 * global et l'appartenance au plan sont déjà pris en compte en amont (backfill + pont).
 *
 * Cache : sessionStorage `ff:${orgId}` = carte { slug: source } partagée par tous les
 * appels de la page (un seul RPC). Stale-while-revalidate : affichage immédiat du cache,
 * ré-interrogation en arrière-plan.
 */
export type FeatureFlagSource = 'override' | 'plan' | 'kill_switch' | null

export interface FeatureFlagState {
  enabled: boolean
  loading: boolean
  source: FeatureFlagSource
}

export function useFeatureFlag(slug: string): FeatureFlagState {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [state, setState] = useState<FeatureFlagState>({ enabled: false, loading: true, source: null })

  useEffect(() => {
    if (!orgId) {
      setState({ enabled: false, loading: !profile, source: null })
      return
    }

    const cacheKey = `ff:${orgId}`
    const apply = (map: Record<string, FeatureFlagSource>, loading: boolean): void => {
      const has = Object.prototype.hasOwnProperty.call(map, slug)
      setState({ enabled: has, loading, source: has ? (map[slug] ?? 'plan') : null })
    }

    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { apply(JSON.parse(cached) as Record<string, FeatureFlagSource>, false) } catch { /* cache corrompu */ }
    }

    const abort = new AbortController()
    void (async () => {
      const { data, error } = await supabase.rpc('my_features').abortSignal(abort.signal)
      if (abort.signal.aborted) return
      if (error) {
        console.warn('[useFeatureFlag] my_features:', error.message)
        if (!cached) setState({ enabled: false, loading: false, source: null })
        return
      }
      const map: Record<string, FeatureFlagSource> = {}
      for (const r of (data ?? []) as Array<{ slug: string; source: string }>) {
        map[r.slug] = (r.source === 'override' ? 'override' : 'plan')
      }
      try { sessionStorage.setItem(cacheKey, JSON.stringify(map)) } catch { /* quota dépassé */ }
      apply(map, false)
    })()

    return () => abort.abort()
  }, [slug, orgId, profile])

  return state
}
