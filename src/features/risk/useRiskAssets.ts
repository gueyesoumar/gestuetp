import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

/** Un bien support (actif) du registre EBIOS, propre à l'organisation. */
export interface RiskAssetRow {
  id: string
  name: string
  category: string
  criticality: 'eleve' | 'standard'
  business_value_id: string | null
  business_value_name: string | null
  description: string | null
}

export interface AssetInput {
  name: string
  category: string
  criticality: 'eleve' | 'standard'
  business_value_id: string | null
  description: string | null
}

interface AssetsData {
  assets: RiskAssetRow[]
  businessValues: Array<{ id: string; name: string }>
  loading: boolean
  error: string | null
  createAsset: (a: AssetInput) => Promise<boolean>
  updateAsset: (id: string, a: AssetInput) => Promise<boolean>
  deleteAsset: (id: string) => Promise<boolean>
  refresh: () => void
}

/** Registre des actifs (biens supports) du volet risque : CRUD org-scoped (RLS). */
export function useRiskAssets(): AssetsData {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [assets, setAssets] = useState<RiskAssetRow[]>([])
  const [businessValues, setBusinessValues] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  const refresh = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const [{ data: ast, error: aErr }, { data: bv }] = await Promise.all([
        supabase.from('risk_assets')
          .select('id, name, category, criticality, business_value_id, description, bv:business_values(name)')
          .eq('organization_id', orgId).order('name').abortSignal(ac.signal),
        supabase.from('business_values').select('id, name').eq('organization_id', orgId).order('name').abortSignal(ac.signal),
      ])
      if (ac.signal.aborted) return
      if (aErr) { console.error('[useRiskAssets]', aErr.message); setError('Chargement impossible.'); setLoading(false); return }
      setAssets(((ast ?? []) as unknown as Array<RiskAssetRow & { bv: { name: string } | null }>).map((r) => ({
        ...r, business_value_name: r.bv?.name ?? null,
      })))
      setBusinessValues((bv ?? []) as Array<{ id: string; name: string }>)
      setError(null)
      setLoading(false)
    })()
    return () => ac.abort()
  }, [orgId, key])

  const createAsset = useCallback(async (a: AssetInput): Promise<boolean> => {
    if (!orgId) return false
    const { error: e } = await supabase.from('risk_assets').insert({
      organization_id: orgId, name: a.name, category: a.category, criticality: a.criticality,
      business_value_id: a.business_value_id, description: a.description, created_by: profile?.id ?? null,
    } as never)
    if (e) { console.error('[createAsset]', e.message); return false }
    refresh(); return true
  }, [orgId, profile?.id, refresh])

  const updateAsset = useCallback(async (id: string, a: AssetInput): Promise<boolean> => {
    const { error: e } = await supabase.from('risk_assets').update({
      name: a.name, category: a.category, criticality: a.criticality,
      business_value_id: a.business_value_id, description: a.description,
    } as never).eq('id', id)
    if (e) { console.error('[updateAsset]', e.message); return false }
    refresh(); return true
  }, [refresh])

  const deleteAsset = useCallback(async (id: string): Promise<boolean> => {
    const { error: e } = await supabase.from('risk_assets').delete().eq('id', id)
    if (e) { console.error('[deleteAsset]', e.message); return false }
    refresh(); return true
  }, [refresh])

  return { assets, businessValues, loading, error, createAsset, updateAsset, deleteAsset, refresh }
}
