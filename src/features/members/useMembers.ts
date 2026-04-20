import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { MemberWithRoles } from './types'
import type { PlatformRole } from '../../types/database.types'

interface UseMembersResult {
  members: MemberWithRoles[]
  loading: boolean
  error: string | null
  refetch: () => void
}

interface UserPlatformRoleRow {
  platform_roles: PlatformRole
}

export function useMembers(): UseMembersResult {
  const { profile } = useAuth()
  const [members, setMembers] = useState<MemberWithRoles[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    supabase
      .from('users')
      .select('*, user_platform_roles!user_platform_roles_user_id_fkey(platform_roles(*))')
      .eq('organization_id', profile.organization_id)
      .eq('role', 'auditor')
      .order('last_name')
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useMembers:', queryError.message)
          setError('Impossible de charger les membres.')
          setMembers([])
        } else {
          const mapped: MemberWithRoles[] = (data ?? []).map((user) => {
            const upr = (user.user_platform_roles ?? []) as unknown as UserPlatformRoleRow[]
            const roles = upr
              .map((r) => r.platform_roles)
              .filter(Boolean)
            return { ...user, user_platform_roles: undefined, roles }
          }) as MemberWithRoles[]
          setMembers(mapped)
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [profile?.organization_id, refreshKey])

  return { members, loading, error, refetch }
}
