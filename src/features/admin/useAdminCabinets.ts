import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface AdminCabinet {
  id: string
  name: string
  slug: string
  types: string[]
  is_active: boolean
  created_at: string
  plan_name: string | null
  plan_price: number | null
  members_count: number
  missions_count: number
  last_activity_at: string | null
}

interface Result {
  cabinets: AdminCabinet[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminCabinets(): Result {
  const [cabinets, setCabinets] = useState<AdminCabinet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        // Charge TOUTES les organisations (cabinets, clients, groupes, plateforme...)
        const { data: orgs, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug, types, is_active, created_at, plans(name, monthly_price_eur)')
          .order('created_at', { ascending: false })
          .abortSignal(abort.signal)

        if (orgError) throw orgError
        const allOrgs = (orgs ?? []) as Array<{
          id: string; name: string; slug: string; types: string[]; is_active: boolean; created_at: string; plans: { name: string; monthly_price_eur: number } | null
        }>

        const ids = allOrgs.map((o) => o.id)
        if (ids.length === 0) {
          setCabinets([])
          setLoading(false)
          return
        }

        // Compter les membres par organisation
        const { data: usersData } = await supabase
          .from('users')
          .select('organization_id')
          .in('organization_id', ids)
          .abortSignal(abort.signal)
        const memberCounts = countBy((usersData ?? []) as Array<{ organization_id: string }>, 'organization_id')

        // Compter les missions où l'organisation est CABINET et trouver la dernière activité
        // Pour les organisations clients, on n'a pas de count missions en tant que cabinet — c'est OK
        const { data: missionsData } = await supabase
          .from('missions')
          .select('cabinet_id, updated_at')
          .in('cabinet_id', ids)
          .abortSignal(abort.signal)
        const missionCounts = countBy((missionsData ?? []) as Array<{ cabinet_id: string }>, 'cabinet_id')
        const lastActivity = lastBy((missionsData ?? []) as Array<{ cabinet_id: string; updated_at: string }>, 'cabinet_id', 'updated_at')

        const enriched: AdminCabinet[] = allOrgs.map((o) => ({
          id: o.id,
          name: o.name,
          slug: o.slug,
          types: o.types ?? [],
          is_active: o.is_active,
          created_at: o.created_at,
          plan_name: o.plans?.name ?? null,
          plan_price: o.plans?.monthly_price_eur ?? null,
          members_count: memberCounts[o.id] ?? 0,
          missions_count: missionCounts[o.id] ?? 0,
          last_activity_at: lastActivity[o.id] ?? null,
        }))

        setCabinets(enriched)
        setLoading(false)
      } catch (err) {
        if (abort.signal.aborted) return
        console.error('useAdminCabinets:', err)
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
        setLoading(false)
      }
    })()

    return () => abort.abort()
  }, [tick])

  return { cabinets, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = String(r[key])
    out[k] = (out[k] ?? 0) + 1
  }
  return out
}

function lastBy<T extends Record<string, unknown>>(rows: T[], groupKey: keyof T, valueKey: keyof T): Record<string, string> {
  const out: Record<string, string> = {}
  for (const r of rows) {
    const k = String(r[groupKey])
    const v = String(r[valueKey])
    if (!out[k] || v > out[k]) out[k] = v
  }
  return out
}
