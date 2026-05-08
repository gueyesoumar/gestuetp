import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export type PlanTier = 'free' | 'standard' | 'enterprise' | 'custom'

export interface AdminPlan {
  id: string
  slug: string
  name: string
  description: string | null
  monthly_price_eur: number
  tier: PlanTier
  max_users: number | null
  max_missions: number | null
  is_default: boolean
  created_at: string
  cabinets_count: number
  features_count: number
}

export interface PlanInput {
  name: string
  description: string | null
  monthly_price_eur: number
  tier: PlanTier
  max_users: number | null
  max_missions: number | null
  is_default: boolean
}

interface Result {
  plans: AdminPlan[]
  featuresByPlan: Map<string, Set<string>>
  loading: boolean
  error: string | null
  refetch: () => void
  createPlan: (input: PlanInput, reason: string) => Promise<{ ok: boolean; error?: string; planId?: string }>
  updatePlan: (planId: string, input: Partial<PlanInput>, reason: string) => Promise<{ ok: boolean; error?: string }>
  deletePlan: (planId: string, reason: string) => Promise<{ ok: boolean; error?: string }>
  setPlanFeatures: (planId: string, flagIds: string[], reason: string) => Promise<{ ok: boolean; error?: string }>
}

export function useAdminPlans(): Result {
  const [plans, setPlans] = useState<AdminPlan[]>([])
  const [featuresByPlan, setFeaturesByPlan] = useState<Map<string, Set<string>>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const [{ data: plansData, error: plansErr }, { data: orgPlanCounts }, { data: pfRows }] = await Promise.all([
          supabase
            .from('plans')
            .select('id, slug, name, description, monthly_price_eur, tier, max_users, max_missions, is_default, created_at')
            .order('monthly_price_eur', { ascending: true })
            .abortSignal(abort.signal),
          supabase
            .from('organizations')
            .select('plan_id')
            .not('plan_id', 'is', null)
            .abortSignal(abort.signal),
          supabase
            .from('plan_features')
            .select('plan_id, flag_id')
            .abortSignal(abort.signal),
        ])
        if (abort.signal.aborted) return
        if (plansErr) throw plansErr

        const cabinetsByPlan = new Map<string, number>()
        for (const o of (orgPlanCounts ?? []) as Array<{ plan_id: string }>) {
          cabinetsByPlan.set(o.plan_id, (cabinetsByPlan.get(o.plan_id) ?? 0) + 1)
        }

        const flagsByPlan = new Map<string, Set<string>>()
        for (const pf of (pfRows ?? []) as Array<{ plan_id: string; flag_id: string }>) {
          if (!flagsByPlan.has(pf.plan_id)) flagsByPlan.set(pf.plan_id, new Set())
          flagsByPlan.get(pf.plan_id)!.add(pf.flag_id)
        }

        const enriched: AdminPlan[] = ((plansData ?? []) as AdminPlan[]).map((p) => ({
          ...p,
          cabinets_count: cabinetsByPlan.get(p.id) ?? 0,
          features_count: flagsByPlan.get(p.id)?.size ?? 0,
        }))

        setPlans(enriched)
        setFeaturesByPlan(flagsByPlan)
        setLoading(false)
      } catch (err) {
        if (abort.signal.aborted) return
        console.error('useAdminPlans:', err)
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
        setLoading(false)
      }
    })()

    return () => abort.abort()
  }, [tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  const callAdminPlans = useCallback(async (body: Record<string, unknown>): Promise<{ ok: boolean; error?: string; planId?: string }> => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-plans', { body })
      if (fnErr) return { ok: false, error: fnErr.message }
      const res = data as { success?: boolean; error?: string; plan_id?: string } | null
      if (res?.error) return { ok: false, error: res.error }
      if (!res?.success) return { ok: false, error: 'Réponse inattendue' }
      refetch()
      return { ok: true, planId: res.plan_id }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
    }
  }, [refetch])

  const createPlan = useCallback((input: PlanInput, reason: string) =>
    callAdminPlans({ action: 'create', reason, ...input }), [callAdminPlans])

  const updatePlan = useCallback((planId: string, input: Partial<PlanInput>, reason: string) =>
    callAdminPlans({ action: 'update', reason, plan_id: planId, ...input }), [callAdminPlans])

  const deletePlan = useCallback((planId: string, reason: string) =>
    callAdminPlans({ action: 'delete', reason, plan_id: planId }), [callAdminPlans])

  const setPlanFeatures = useCallback((planId: string, flagIds: string[], reason: string) =>
    callAdminPlans({ action: 'set_features', reason, plan_id: planId, flag_ids: flagIds }), [callAdminPlans])

  return { plans, featuresByPlan, loading, error, refetch, createPlan, updatePlan, deletePlan, setPlanFeatures }
}
