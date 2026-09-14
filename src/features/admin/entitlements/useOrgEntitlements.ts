import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'
import { useToast } from '../../../hooks/useToast'
import type { OrgEntitlementState } from '../../../types/database.types'

/**
 * Console d'entitlements (RFC 0008 INC 5b). Lit org_entitlement_state (RPC) et
 * mute via l'edge admin-entitlement (motif obligatoire). Aucune écriture directe.
 */
export interface EntitlementAction {
  action: 'set_attributes' | 'grant_manual' | 'remove_manual' | 'set_status' | 'apply_template'
  key?: string
  plan_slug?: string
  reason: string
  pricing_kind?: string
  price_amount?: number | null
  price_unit?: string | null
  included_qty?: number | null
  discount_pct?: number
  enforcement?: string
  limit_value?: number | null
  capability?: string | null
  status?: string
  trial_ends_at?: string | null
}

export interface TemplatePlan { slug: string; name: string }

interface Result {
  state: OrgEntitlementState | null
  plans: TemplatePlan[]
  loading: boolean
  busy: boolean
  act: (a: EntitlementAction) => Promise<boolean>
  reload: () => Promise<void>
}

export function useOrgEntitlements(orgId: string): Result {
  const [state, setState] = useState<OrgEntitlementState | null>(null)
  const [plans, setPlans] = useState<TemplatePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    const [{ data, error }, { data: planRows }] = await Promise.all([
      supabase.rpc('org_entitlement_state', { p_org: orgId }),
      supabase.from('plans').select('slug, name').order('slug'),
    ])
    if (error) {
      console.error('[useOrgEntitlements]', error.message)
      toast.error('Erreur de chargement', error)
      setLoading(false)
      return
    }
    setState(data as OrgEntitlementState)
    setPlans((planRows ?? []) as TemplatePlan[])
    setLoading(false)
  }, [orgId, toast])

  useEffect(() => { setLoading(true); void load() }, [load])

  const act = useCallback(async (a: EntitlementAction): Promise<boolean> => {
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('admin-entitlement', {
      body: { ...a, organization_id: orgId },
    })
    setBusy(false)
    if (error || (data as { error?: string })?.error) {
      toast.error('Action impossible', await readInvokeError(error, data, 'Erreur'))
      return false
    }
    toast.success('Entitlement mis à jour')
    await load()
    return true
  }, [orgId, load, toast])

  return { state, plans, loading, busy, act, reload: load }
}
