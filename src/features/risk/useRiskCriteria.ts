import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { DEFAULT_ACCEPTANCE_THRESHOLD, DEFAULT_REVIEW_MONTHS } from '../../lib/constants'
import type { RiskCriteria } from '../../types/database.types'

/** Champs éditables des critères de risque. */
export interface RiskCriteriaPatch {
  acceptance_threshold: number
  appetite_statement: string | null
  review_default_months: number
  likelihood_labels: string[] | null
  impact_labels: string[] | null
  auto_promote_findings: boolean
}

export interface UseRiskCriteriaResult {
  /** Seuil d'acceptation effectif (ligne org ou défaut plateforme). */
  acceptanceThreshold: number
  appetiteStatement: string | null
  reviewDefaultMonths: number
  likelihoodLabels: string[] | null
  impactLabels: string[] | null
  autoPromoteFindings: boolean
  /** true = l'org a personnalisé ses critères ; false = défauts plateforme. */
  customized: boolean
  loading: boolean
  error: string | null
  /** Exposition (0..100) strictement au-dessus du seuil = hors appétit. */
  isAboveThreshold: (exposure: number) => boolean
  saveCriteria: (patch: RiskCriteriaPatch) => Promise<boolean>
  refresh: () => void
}

export function useRiskCriteria(): UseRiskCriteriaResult {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [raw, setRaw] = useState<RiskCriteria | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  const refresh = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error: e } = await supabase
        .from('risk_criteria')
        .select('*')
        .eq('organization_id', orgId)
        .abortSignal(ac.signal)
        .maybeSingle()
      if (ac.signal.aborted) return
      if (e) {
        console.error('[useRiskCriteria]', e.message)
        setError('Chargement des critères impossible.')
        setLoading(false)
        return
      }
      setRaw((data ?? null) as unknown as RiskCriteria | null)
      setError(null)
      setLoading(false)
    })()
    return () => ac.abort()
  }, [orgId, key])

  const saveCriteria = useCallback(async (patch: RiskCriteriaPatch): Promise<boolean> => {
    if (!orgId) return false
    const { error: e } = await supabase
      .from('risk_criteria')
      .upsert({ organization_id: orgId, created_by: profile?.id ?? null, ...patch } as never,
        { onConflict: 'organization_id' })
    if (e) { console.error('[saveCriteria]', e.message); return false }
    refresh()
    return true
  }, [orgId, profile?.id, refresh])

  const acceptanceThreshold = raw?.acceptance_threshold ?? DEFAULT_ACCEPTANCE_THRESHOLD

  return {
    acceptanceThreshold,
    appetiteStatement: raw?.appetite_statement ?? null,
    reviewDefaultMonths: raw?.review_default_months ?? DEFAULT_REVIEW_MONTHS,
    likelihoodLabels: raw?.likelihood_labels ?? null,
    impactLabels: raw?.impact_labels ?? null,
    autoPromoteFindings: raw?.auto_promote_findings ?? false,
    customized: raw != null,
    loading,
    error,
    isAboveThreshold: (exposure: number) => exposure > acceptanceThreshold,
    saveCriteria,
    refresh,
  }
}
