import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { PlatformRole } from '../../types/database.types'

interface UsePlatformRolesResult {
  roles: PlatformRole[]
  loading: boolean
  error: string | null
}

export function usePlatformRoles(): UsePlatformRolesResult {
  const { profile } = useAuth()
  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()

    supabase
      .from('platform_roles')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('name')
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('usePlatformRoles:', queryError.message)
          setError('Impossible de charger les r\u00f4les.')
        } else {
          setRoles(data ?? [])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [profile?.organization_id])

  return { roles, loading, error }
}
