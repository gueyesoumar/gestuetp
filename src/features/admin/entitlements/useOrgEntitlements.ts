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
  action: 'set_attributes' | 'grant_manual' | 'remove_manual' | 'set_status'
  key: string
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

interface Result {
  state: OrgEntitlementState | null
  loading: boolean
  busy: boolean
  act: (a: EntitlementAction) => Promise<boolean>
  reload: () => Promise<void>
}

export function useOrgEntitlements(orgId: string): Result {
  const [state, setState] = useState<OrgEntitlementState | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('org_entitlement_state', { p_org: orgId })
    if (error) {
      console.error('[useOrgEntitlements]', error.message)
      toast.error('Erreur de chargement', error)
      setLoading(false)
      return
    }
    setState(data as OrgEntitlementState)
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

  return { state, loading, busy, act, reload: load }
}
