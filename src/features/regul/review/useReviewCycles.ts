import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction'
import type { AssujettiReviewCycle } from '../../../types/database.types'

interface Result {
  cycles: Record<string, AssujettiReviewCycle>
  loading: boolean
  setCadence: (frameworkId: string, months: number | null) => Promise<{ ok: boolean; error?: string }>
  launchReview: (sourceMissionId: string) => Promise<{ ok: boolean; error?: string; data?: unknown }>
}

/** Cycles de revue d'un assujetti (map par framework_id). Édition via l'Edge
 *  set-review-cadence (service_role). n°18 Lot 1. */
export function useReviewCycles(orgId: string | undefined): Result {
  const [cycles, setCycles] = useState<Record<string, AssujettiReviewCycle>>({})
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    supabase
      .from('assujetti_review_cycles')
      .select('*')
      .eq('organization_id', orgId)
      .abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) console.error('[useReviewCycles]', error.message)
        const map: Record<string, AssujettiReviewCycle> = {}
        for (const c of (data ?? []) as AssujettiReviewCycle[]) map[c.framework_id] = c
        setCycles(map)
        setLoading(false)
      })
    return () => ac.abort()
  }, [orgId, refreshKey])

  const setCadence = useCallback(async (frameworkId: string, months: number | null) => {
    const res = await invokeEdgeFunction('set-review-cadence', {
      organization_id: orgId, framework_id: frameworkId, frequency_months: months,
    })
    if (res.ok) setRefreshKey((k) => k + 1)
    return res
  }, [orgId])

  const launchReview = useCallback(async (sourceMissionId: string) => {
    return await invokeEdgeFunction('launch-review', { source_mission_id: sourceMissionId })
  }, [])

  return { cycles, loading, setCadence, launchReview }
}

/** Statut d'échéance d'une revue, dérivé de next_review_at (seuil « bientôt » = 60 j). */
export function reviewStatus(nextReviewAt: string | null | undefined): { label: string; cls: string } | null {
  if (!nextReviewAt) return null
  const days = Math.round((new Date(nextReviewAt).getTime() - Date.now()) / 86400000)
  if (days < 0) return { label: `En retard ${-days} j`, cls: 'bg-red-50 text-red-600' }
  if (days <= 60) return { label: `Dans ${days} j`, cls: 'bg-orange-50 text-orange-600' }
  const months = Math.round(days / 30)
  return { label: `Dans ${months} mois`, cls: 'bg-forest-50 text-forest-700' }
}
