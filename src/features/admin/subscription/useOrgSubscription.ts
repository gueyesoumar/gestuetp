import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'
import { useToast } from '../../../hooks/useToast'
import type { OrgSubscriptionState, Product, ProductFeature } from '../../../types/database.types'

export interface SubscriptionPlan {
  slug: string
  name: string
  description: string | null
  products: string[]
}
export interface SubscriptionCatalog {
  products: Product[]
  features: ProductFeature[]
  plans: SubscriptionPlan[]
}

/** Payload d'une action de la console (relayé à l'edge admin-subscription). */
export interface SubscriptionAction {
  action:
    | 'subscribe' | 'trial' | 'set_status' | 'remove' | 'apply_plan'
    | 'set_discount' | 'set_product_discount' | 'toggle_feature' | 'set_home'
  product_key?: string
  feature_key?: string
  plan_slug?: string
  status?: string
  enabled?: boolean
  discount_pct?: number
  trial_days?: number
}

interface Result {
  state: OrgSubscriptionState | null
  catalog: SubscriptionCatalog | null
  platformMrr: number | null
  loading: boolean
  busy: boolean
  act: (a: SubscriptionAction) => Promise<boolean>
}

/**
 * Console d'abonnement d'une org (RFC 0006 P4b). Lit l'état via la primitive
 * SECURITY DEFINER org_subscription_state (contourne la RLS own-org côté superadmin),
 * le catalogue produits/plans, et relaie les mutations à l'edge admin-subscription.
 */
export function useOrgSubscription(orgId: string): Result {
  const toast = useToast()
  const [state, setState] = useState<OrgSubscriptionState | null>(null)
  const [catalog, setCatalog] = useState<SubscriptionCatalog | null>(null)
  const [platformMrr, setPlatformMrr] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const loadState = useCallback(async () => {
    const { data, error } = await supabase.rpc('org_subscription_state', { p_org: orgId })
    if (error) { console.error('org_subscription_state:', error.message); return }
    setState(data as OrgSubscriptionState)
  }, [orgId])

  useEffect(() => {
    let active = true
    void (async () => {
      setLoading(true)
      const [st, prods, feats, plans, pprods, pmrr] = await Promise.all([
        supabase.rpc('org_subscription_state', { p_org: orgId }),
        supabase.from('products').select('*').order('sort_order'),
        supabase.from('product_features').select('*').order('sort_order'),
        supabase.from('plans').select('slug, name, description'),
        supabase.from('plan_products').select('plan_slug, product_key'),
        supabase.rpc('platform_mrr'),
      ])
      if (!active) return
      if (st.error) console.error('state:', st.error.message)
      else setState(st.data as OrgSubscriptionState)
      if (prods.error || feats.error || plans.error) {
        console.error('catalogue:', prods.error?.message ?? feats.error?.message ?? plans.error?.message)
      } else {
        const byPlan = new Map<string, string[]>()
        for (const pp of (pprods.data ?? []) as Array<{ plan_slug: string; product_key: string }>) {
          byPlan.set(pp.plan_slug, [...(byPlan.get(pp.plan_slug) ?? []), pp.product_key])
        }
        setCatalog({
          products: (prods.data ?? []) as Product[],
          features: (feats.data ?? []) as ProductFeature[],
          plans: ((plans.data ?? []) as Array<{ slug: string; name: string; description: string | null }>)
            .map((p) => ({ ...p, products: byPlan.get(p.slug) ?? [] })),
        })
      }
      if (!pmrr.error) setPlatformMrr(pmrr.data as number)
      setLoading(false)
    })()
    return () => { active = false }
  }, [orgId])

  const act = useCallback(async (a: SubscriptionAction): Promise<boolean> => {
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-subscription', {
      body: { ...a, organization_id: orgId, reason: 'Gestion via console abonnement' },
    })
    setBusy(false)
    if (error) { toast.error(await readInvokeError(error, data, 'Action impossible')); return false }
    const d = data as { state?: OrgSubscriptionState }
    if (d?.state) setState(d.state)
    else await loadState()
    return true
  }, [orgId, loadState, toast])

  return { state, catalog, platformMrr, loading, busy, act }
}
