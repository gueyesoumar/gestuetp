import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Charge les quotas du cabinet de l'utilisateur courant.
 *
 * La limite affichée provient de la RPC `org_effective_quota()` : la MÊME source
 * que les triggers d'enforcement DB (org_quota_limits, repli plans.max_*, RFC 0008
 * P0). La jauge reflète donc exactement ce que la plateforme bloque, y compris une
 * surcharge par org — contrairement à l'ancienne lecture directe de plans.max_*.
 *
 * Retourne `null` (pas de quota) si :
 *  - aucun cabinet rattaché
 *  - la limite effective est NULL (illimité)
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
        const [{ data: orgRow, error: orgErr }, { data: quotaRow, error: quotaErr }, { count: usersCount }, { count: missionsCount }] = await Promise.all([
          supabase
            .from('organizations')
            .select('types')
            .eq('id', orgId)
            .abortSignal(abort.signal)
            .single(),
          // Limite EFFECTIVE (org_quota_limits, repli plans.max_*) — même source que
          // les triggers d'enforcement. RPC own-org, sans paramètre.
          supabase.rpc('org_effective_quota').abortSignal(abort.signal),
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
            .eq('is_demo', false) // la démo ne consomme pas le quota du plan
            .abortSignal(abort.signal),
        ])
        if (abort.signal.aborted) return
        if (orgErr) throw orgErr
        if (quotaErr) throw quotaErr

        const org = orgRow as { types: string[] } | null
        const quota = (quotaRow ?? {}) as { users: number | null; missions: number | null }
        const isPlatformOrg = (org?.types ?? []).includes('platform')

        setQuotas({
          maxUsers: quota.users ?? null,
          currentActiveUsers: usersCount ?? 0,
          maxMissions: quota.missions ?? null,
          currentActiveMissions: missionsCount ?? 0,
          isPlatformOrg,
        })
        setLoading(false)
      } catch (err) {
        if (abort.signal.aborted) return
        console.error('useMyCabinetQuotas:', err)
        setError('Erreur de chargement')
        setLoading(false)
      }
    })()

    return () => abort.abort()
  }, [orgId, tick])

  return { quotas, loading, error, refetch: () => setTick((t) => t + 1) }
}
