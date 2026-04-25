import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface CabinetDetail {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at: string
  plan_name: string | null
  plan_price: number | null
  members: Array<{ id: string; email: string; first_name: string; last_name: string; job_title: string | null; is_active: boolean }>
  missions: Array<{ id: string; name: string; status: string; updated_at: string }>
}

interface Result {
  cabinet: CabinetDetail | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminCabinetDetail(cabinetId: string | undefined): Result {
  const [cabinet, setCabinet] = useState<CabinetDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!cabinetId) {
      setLoading(false)
      return
    }

    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug, is_active, created_at, plans(name, monthly_price_eur)')
          .eq('id', cabinetId)
          .abortSignal(abort.signal)
          .single()

        if (orgError || !org) throw orgError ?? new Error('Cabinet introuvable')
        const o = org as { id: string; name: string; slug: string; is_active: boolean; created_at: string; plans: { name: string; monthly_price_eur: number } | null }

        const { data: members } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, job_title, is_active')
          .eq('organization_id', cabinetId)
          .order('is_active', { ascending: false })
          .order('last_sign_in_at', { ascending: false, nullsFirst: false })
          .abortSignal(abort.signal)

        const { data: missions } = await supabase
          .from('missions')
          .select('id, name, status, updated_at')
          .eq('cabinet_id', cabinetId)
          .order('updated_at', { ascending: false })
          .limit(20)
          .abortSignal(abort.signal)

        if (abort.signal.aborted) return
        setCabinet({
          id: o.id,
          name: o.name,
          slug: o.slug,
          is_active: o.is_active,
          created_at: o.created_at,
          plan_name: o.plans?.name ?? null,
          plan_price: o.plans?.monthly_price_eur ?? null,
          members: (members ?? []) as CabinetDetail['members'],
          missions: (missions ?? []) as CabinetDetail['missions'],
        })
        setLoading(false)
      } catch (err) {
        if (abort.signal.aborted) return
        console.error('useAdminCabinetDetail:', err)
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
        setLoading(false)
      }
    })()

    return () => abort.abort()
  }, [cabinetId, tick])

  return { cabinet, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
