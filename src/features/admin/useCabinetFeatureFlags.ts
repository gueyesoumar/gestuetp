import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export type FlagState =
  | 'plan_included'      // inclus dans le plan, pas d'override, kill switch global ON
  | 'override_on'        // forcé ON par override (peut être inclus dans plan ou pas)
  | 'override_off'       // forcé OFF par override
  | 'available'          // hors plan, pas d'override, kill switch ON → débloquable
  | 'unavailable'        // kill switch global désactivé

export type FeatureCategory = 'ai' | 'reporting' | 'branding' | 'security' | 'collab' | 'general'
export type FeatureMaturity = 'stable' | 'beta' | 'new'

export interface CabinetFlag {
  flag_id: string
  slug: string
  name: string
  description: string | null
  category: FeatureCategory
  maturity: FeatureMaturity
  is_globally_enabled: boolean
  in_plan: boolean
  override_enabled: boolean | null
  override_reason: string | null
  override_updated_at: string | null
  state: FlagState
}

export interface CabinetPlanInfo {
  id: string | null
  name: string | null
  slug: string | null
}

interface Result {
  flags: CabinetFlag[]
  plan: CabinetPlanInfo
  loading: boolean
  error: string | null
  setOverride: (slug: string, enabled: boolean, reason: string) => Promise<boolean>
  resetOverride: (slug: string, reason: string) => Promise<boolean>
  refetch: () => void
}

interface FlagRow { id: string; slug: string; name: string; description: string | null; category: FeatureCategory; maturity: FeatureMaturity; is_globally_enabled: boolean }
interface OverrideRow { flag_id: string; enabled: boolean; reason: string; updated_at: string }

function computeState(args: { isGlobal: boolean; inPlan: boolean; override: OverrideRow | null }): FlagState {
  if (!args.isGlobal) return 'unavailable'
  if (args.override) return args.override.enabled ? 'override_on' : 'override_off'
  if (args.inPlan) return 'plan_included'
  return 'available'
}

export function useCabinetFeatureFlags(cabinetId: string | undefined): Result {
  const [flags, setFlags] = useState<CabinetFlag[]>([])
  const [plan, setPlan] = useState<CabinetPlanInfo>({ id: null, name: null, slug: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!cabinetId) { setLoading(false); return }
    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const [{ data: flagsRows, error: flagsErr }, { data: orgRow, error: orgErr }, { data: overrides, error: ovErr }] = await Promise.all([
          supabase
            .from('feature_flags')
            .select('id, slug, name, description, category, maturity, is_globally_enabled')
            .order('name')
            .abortSignal(abort.signal),
          supabase
            .from('organizations')
            .select('plan_id, plan:plans(id, slug, name)')
            .eq('id', cabinetId).single()
            .abortSignal(abort.signal),
          supabase
            .from('feature_flag_overrides')
            .select('flag_id, enabled, reason, updated_at')
            .eq('organization_id', cabinetId)
            .abortSignal(abort.signal),
        ])
        if (abort.signal.aborted) return
        if (flagsErr || orgErr || ovErr) {
          setError('Chargement impossible')
          setLoading(false)
          return
        }

        const planObj = (orgRow as { plan: { id: string; slug: string; name: string } | null } | null)?.plan ?? null
        const planId = planObj?.id ?? null
        let planFlagIds = new Set<string>()
        if (planId) {
          const { data: pfRows } = await supabase
            .from('plan_features')
            .select('flag_id')
            .eq('plan_id', planId)
            .abortSignal(abort.signal)
          if (abort.signal.aborted) return
          planFlagIds = new Set(((pfRows ?? []) as Array<{ flag_id: string }>).map((r) => r.flag_id))
        }

        const overrideMap = new Map<string, OverrideRow>()
        for (const o of (overrides ?? []) as OverrideRow[]) overrideMap.set(o.flag_id, o)

        const merged: CabinetFlag[] = ((flagsRows ?? []) as FlagRow[]).map((f) => {
          const ov = overrideMap.get(f.id) ?? null
          const inPlan = planFlagIds.has(f.id)
          return {
            flag_id: f.id,
            slug: f.slug,
            name: f.name,
            description: f.description,
            category: f.category,
            maturity: f.maturity,
            is_globally_enabled: f.is_globally_enabled,
            in_plan: inPlan,
            override_enabled: ov?.enabled ?? null,
            override_reason: ov?.reason ?? null,
            override_updated_at: ov?.updated_at ?? null,
            state: computeState({ isGlobal: f.is_globally_enabled, inPlan, override: ov }),
          }
        })

        setFlags(merged)
        setPlan({ id: planId, name: planObj?.name ?? null, slug: planObj?.slug ?? null })
        setLoading(false)
      } catch (err) {
        if (abort.signal.aborted) return
        console.error('useCabinetFeatureFlags:', err)
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
        setLoading(false)
      }
    })()

    return () => abort.abort()
  }, [cabinetId, tick])

  const callOverride = useCallback(async (action: 'set' | 'reset', slug: string, reason: string, enabled?: boolean): Promise<boolean> => {
    if (!cabinetId) return false
    const body: Record<string, unknown> = { action, cabinet_id: cabinetId, flag_slug: slug, reason }
    if (action === 'set') body.enabled = enabled
    const { data, error: fnError } = await supabase.functions.invoke('admin-feature-flag-overrides', { body })
    if (fnError || data?.error) {
      console.error(`${action}Override:`, fnError?.message ?? data?.error)
      return false
    }
    sessionStorage.removeItem(`ff:${cabinetId}:${slug}`)
    setTick((t) => t + 1)
    return true
  }, [cabinetId])

  const setOverride = useCallback((slug: string, enabled: boolean, reason: string) =>
    callOverride('set', slug, reason, enabled), [callOverride])
  const resetOverride = useCallback((slug: string, reason: string) =>
    callOverride('reset', slug, reason), [callOverride])

  const refetch = useCallback(() => setTick((t) => t + 1), [])
  return { flags, plan, loading, error, setOverride, resetOverride, refetch }
}
