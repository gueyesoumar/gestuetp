import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface SoARow {
  control_code: string
  control_name: string
  kind: string
  scenario_title: string
  justification: string | null
}

/**
 * Déclaration d'Applicabilité (SoA) : liens contrôle <-> scénario de risque traité
 * de l'organisation, avec justification d'applicabilité (RFC 0017 Lot 5).
 */
export function useSoA(): { rows: SoARow[]; loading: boolean; error: string | null } {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [rows, setRows] = useState<SoARow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase
        .from('risk_control_links')
        .select('kind, applicability_justification, control:controls(code, name), scenario:risk_scenarios(title)')
        .eq('organization_id', orgId)
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useSoA]', e.message); setError('Chargement de la SoA impossible.'); setLoading(false); return }
      type Raw = { kind: string; applicability_justification: string | null; control: { code: string; name: string } | null; scenario: { title: string } | null }
      setRows(((data ?? []) as unknown as Raw[]).map((r) => ({
        control_code: r.control?.code ?? '-',
        control_name: r.control?.name ?? '',
        kind: r.kind,
        scenario_title: r.scenario?.title ?? '-',
        justification: r.applicability_justification,
      })))
      setError(null); setLoading(false)
    })()
    return () => ac.abort()
  }, [orgId])

  return { rows, loading, error }
}
