import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface CabinetMember {
  id: string
  email: string
  first_name: string
  last_name: string
  job_title: string | null
  phone: string | null
  is_active: boolean
  is_platform_owner: boolean
  last_sign_in_at: string | null
  created_at: string
  platform_roles: string[]
}

interface Result {
  members: CabinetMember[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useCabinetMembersAll(cabinetId: string | undefined): Result {
  const [members, setMembers] = useState<CabinetMember[]>([])
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
      const { data: rows, error: queryError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, job_title, phone, is_active, is_platform_owner, last_sign_in_at, created_at')
        .eq('organization_id', cabinetId)
        .order('is_active', { ascending: false })
        .order('last_sign_in_at', { ascending: false, nullsFirst: false })
        .abortSignal(abort.signal)

      if (abort.signal.aborted) return
      if (queryError) {
        setError('Chargement des membres impossible')
        setLoading(false)
        return
      }

      const ids = ((rows ?? []) as Array<{ id: string }>).map((r) => r.id)
      const rolesByUser = new Map<string, string[]>()
      if (ids.length > 0) {
        const { data: roleRows } = await supabase
          .from('user_platform_roles')
          .select('user_id, platform_roles(name)')
          .in('user_id', ids)
          .abortSignal(abort.signal)

        for (const r of ((roleRows ?? []) as Array<{ user_id: string; platform_roles: { name: string } | null }>)) {
          const existing = rolesByUser.get(r.user_id) ?? []
          if (r.platform_roles?.name) existing.push(r.platform_roles.name)
          rolesByUser.set(r.user_id, existing)
        }
      }

      if (abort.signal.aborted) return
      setMembers(((rows ?? []) as Array<Record<string, unknown>>).map((r) => ({
        id: r.id as string,
        email: r.email as string,
        first_name: r.first_name as string,
        last_name: r.last_name as string,
        job_title: r.job_title as string | null,
        phone: r.phone as string | null,
        is_active: r.is_active as boolean,
        is_platform_owner: (r.is_platform_owner as boolean) ?? false,
        last_sign_in_at: r.last_sign_in_at as string | null,
        created_at: r.created_at as string,
        platform_roles: rolesByUser.get(r.id as string) ?? [],
      })))
      setLoading(false)
    })()

    return () => abort.abort()
  }, [cabinetId, tick])

  return { members, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
