import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Charge les quotas du cabinet de l'utilisateur courant.
 *
 * Retourne `null` (pas de quota) si :
 *  - aucun cabinet rattaché
 *  - le plan du cabinet n'a pas de limite (max_* = NULL)
 *  - l'organisation est de type 'platform' (exemptée par les triggers DB)
 *
 * Sinon retourne les valeurs courantes + max pour afficher des jauges.
 */

export interface CabinetQuotas {
  maxUsers: number | null
  currentActiveUsers: number
  maxMissions: number | null
  currentActiveMissions: number
  isPlatformOrg: boolean
}

interface Result {
  quotas: CabinetQuotas | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMyCabinetQuotas(): Result {
  const { profile } = useAuth()
  const orgId = profile?.organization_id ?? null
  const [quotas, setQuotas] = useState<CabinetQuotas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!orgId) { setLoading(false); return }
    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const [{ data: orgRow, error: orgErr }, { count: usersCount }, { count: missionsCount }] = await Promise.all([
          supabase
            .from('organizations')
            .select('types, plan:plans(max_users, max_missions)')
            .eq('id', orgId).single()
            .abortSignal(abort.signal),
          supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .abortSignal(abort.signal),
          supabase
            .from('missions')
            .select('id', { count: 'exact', head: true })
            .eq('cabinet_id', orgId)
            .eq('is_active', true)
            .abortSignal(abort.signal),
        ])
        if (abort.signal.aborted) return
        if (orgErr) throw orgErr

        const org = orgRow as { types: string[]; plan: { max_users: number | null; max_missions: number | null } | null } | null
        const isPlatformOrg = (org?.types ?? []).includes('platform')

        setQuotas({
          maxUsers: org?.plan?.max_users ?? null,
          currentActiveUsers: usersCount ?? 0,
          maxMissions: org?.plan?.max_missions ?? null,
          currentActiveMissions: missionsCount ?? 0,
          isPlatformOrg,
        })
        setLoading(false)
      } catch (err) {
        if (abort.signal.aborted) return
        console.error('useMyCabinetQuotas:', err)
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
        setLoading(false)
      }
    })()

    return () => abort.abort()
  }, [orgId, tick])

  return { quotas, loading, error, refetch: () => setTick((t) => t + 1) }
}
