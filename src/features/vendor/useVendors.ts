import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
import { useToast } from '../../hooks/useToast'

export interface VendorListItem {
  relationship_id: string
  organization_id: string
  name: string
  sector: string | null
  services: string | null
  data_access_level: string
  criticality: string
  qualification_status: string
  valid_until: string | null
  next_assessment_at: string | null
}

export interface CreateVendorInput {
  vendor_name: string
  registration_number?: string | null
  sector?: string | null
  country?: string | null
  services?: string | null
  data_access_level?: string
  criticality?: string
  contract_start?: string | null
  contract_end?: string | null
  internal_ref?: string | null
}

/** Registre des tiers / fournisseurs de l'org courante (RFC 0020 Lot 1). */
export function useVendors() {
  const [rows, setRows] = useState<VendorListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const load = useCallback(async (signal?: AbortSignal) => {
    const q = supabase.rpc('get_my_vendors')
    const { data, error: e } = signal ? await q.abortSignal(signal) : await q
    if (signal?.aborted) return
    if (e) { console.error('[useVendors]', e.message); setError('Chargement du registre impossible.'); setLoading(false); return }
    setRows((data ?? []) as VendorListItem[])
    setError(null); setLoading(false)
  }, [])

  useEffect(() => {
    const ac = new AbortController()
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const create = useCallback(async (input: CreateVendorInput): Promise<boolean> => {
    setBusy(true)
    const { data, error: e } = await supabase.functions.invoke('create-vendor', { body: input })
    setBusy(false)
    if (e || (data as { error?: string })?.error) {
      toast.error('Création impossible', await readInvokeError(e, data, 'Erreur'))
      return false
    }
    toast.success('Fournisseur ajouté', { description: input.vendor_name })
    await load()
    return true
  }, [load, toast])

  return { rows, loading, error, busy, create, reload: () => load() }
}
