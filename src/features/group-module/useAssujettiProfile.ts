import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/** Profil réglementaire d'un assujetti (Regul) : identité régulée en tête du dossier. */
export interface AssujettiRegProfile {
  entityType: string | null
  criticality: 'eleve' | 'standard' | null
  obligationRegime: string | null
  tier: string | null
  status: string | null
  entryDate: string | null
}

/**
 * Charge le profil réglementaire d'un assujetti (table entity_regulatory_profile,
 * scopée par la RLS) + sa nature (organizations.entity_type). Regul uniquement -
 * la page /filiales (Comply) ne l'utilise pas.
 */
export function useAssujettiProfile(orgId: string | undefined): { profile: AssujettiRegProfile | null; loading: boolean } {
  const [profile, setProfile] = useState<AssujettiRegProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return
    const ac = new AbortController()
    setLoading(true)

    const load = async (): Promise<void> => {
      const [orgRes, rpRes] = await Promise.all([
        supabase.from('organizations').select('entity_type').eq('id', orgId).maybeSingle(),
        supabase.from('entity_regulatory_profile').select('criticality, obligation_regime, tier, status, entry_date').eq('organization_id', orgId).maybeSingle(),
      ])
      if (ac.signal.aborted) return
      if (orgRes.error) console.error('[useAssujettiProfile] org:', orgRes.error.message)
      if (rpRes.error) console.error('[useAssujettiProfile] reg profile:', rpRes.error.message)
      const rp = rpRes.data as { criticality: 'eleve' | 'standard' | null; obligation_regime: string | null; tier: string | null; status: string | null; entry_date: string | null } | null
      setProfile({
        entityType: (orgRes.data?.entity_type as string | null) ?? null,
        criticality: rp?.criticality ?? null,
        obligationRegime: rp?.obligation_regime ?? null,
        tier: rp?.tier ?? null,
        status: rp?.status ?? null,
        entryDate: rp?.entry_date ?? null,
      })
      setLoading(false)
    }

    void load()
    return () => ac.abort()
  }, [orgId])

  return { profile, loading }
}
