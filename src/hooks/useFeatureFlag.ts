import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Lit l'état effectif d'un feature flag pour l'utilisateur courant.
 *
 * Résolution plan-based (Piste B) :
 *   1. Si flag.is_globally_enabled = false → OFF (kill switch plateforme)
 *   2. Sinon si feature_flag_overrides existe pour l'org → utilise l'override
 *   3. Sinon si plan_features contient (org.plan_id, flag.id) → ON
 *   4. Sinon → OFF (hors plan)
 *
 * Cache : sessionStorage clé `ff:${orgId}:${slug}`. L'admin invalide via
 * sessionStorage.removeItem lorsqu'il modifie un override / les features
 * d'un plan.
 *
 * Usage :
 *   const { enabled, loading, source } = useFeatureFlag('weekly_digest_email')
 *   if (loading) return null
 *   if (!enabled) return null
 */
export type FeatureFlagSource = 'override' | 'plan' | 'kill_switch' | null

export interface FeatureFlagState {
  enabled: boolean
  loading: boolean
  source: FeatureFlagSource
}

interface CachedValue { enabled: boolean; source: FeatureFlagSource }

export function useFeatureFlag(slug: string): FeatureFlagState {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [state, setState] = useState<FeatureFlagState>({ enabled: false, loading: true, source: null })

  useEffect(() => {
    if (!orgId) {
      setState({ enabled: false, loading: !profile, source: null })
      return
    }

    const cacheKey = `ff:${orgId}:${slug}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CachedValue
        setState({ enabled: parsed.enabled, loading: false, source: parsed.source })
        return
      } catch {
        // cache corrompu — on ré-interroge
      }
    }

    const abort = new AbortController()
    void (async () => {
      const [flagRes, orgRes] = await Promise.all([
        supabase
          .from('feature_flags')
          .select('id, is_globally_enabled')
          .eq('slug', slug)
          .abortSignal(abort.signal)
          .maybeSingle(),
        supabase
          .from('organizations')
          .select('plan_id')
          .eq('id', orgId)
          .abortSignal(abort.signal)
          .maybeSingle(),
      ])
      if (abort.signal.aborted) return

      const flag = flagRes.data as { id: string; is_globally_enabled: boolean } | null
      if (!flag) {
        if (flagRes.error) console.warn(`[useFeatureFlag] ${slug}:`, flagRes.error.message)
        setState({ enabled: false, loading: false, source: null })
        return
      }

      if (!flag.is_globally_enabled) {
        commit(cacheKey, { enabled: false, source: 'kill_switch' }, setState)
        return
      }

      const orgPlanId = (orgRes.data as { plan_id: string | null } | null)?.plan_id ?? null

      const [overrideRes, planFeatureRes] = await Promise.all([
        supabase
          .from('feature_flag_overrides')
          .select('enabled')
          .eq('flag_id', flag.id)
          .eq('organization_id', orgId)
          .abortSignal(abort.signal)
          .maybeSingle(),
        orgPlanId
          ? supabase
              .from('plan_features')
              .select('flag_id')
              .eq('plan_id', orgPlanId)
              .eq('flag_id', flag.id)
              .abortSignal(abort.signal)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])
      if (abort.signal.aborted) return

      const override = overrideRes.data as { enabled: boolean } | null
      if (override) {
        commit(cacheKey, { enabled: override.enabled, source: 'override' }, setState)
        return
      }

      const inPlan = (planFeatureRes.data as { flag_id: string } | null) !== null
      commit(cacheKey, { enabled: inPlan, source: 'plan' }, setState)
    })()

    return () => abort.abort()
  }, [slug, orgId, profile])

  return state
}

function commit(cacheKey: string, value: CachedValue, setState: (s: FeatureFlagState) => void): void {
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(value))
  } catch {
    // quota dépassé — on continue sans cache
  }
  setState({ enabled: value.enabled, loading: false, source: value.source })
}
