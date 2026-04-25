import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface AdminUserRow {
  id: string
  auth_id: string
  email: string
  first_name: string
  last_name: string
  role: 'auditor' | 'client'
  is_active: boolean
  is_platform_owner: boolean
  last_sign_in_at: string | null
  organization_id: string
  organization_name: string
}

interface Result {
  users: AdminUserRow[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminUsers(query: string): Result {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setUsers([])
      setLoading(false)
      return
    }

    const abort = new AbortController()
    setLoading(true)
    setError(null)

    const like = `%${trimmed}%`
    void supabase
      .from('users')
      .select('id, auth_id, email, first_name, last_name, role, is_active, is_platform_owner, last_sign_in_at, organization_id, organizations(name)')
      .or(`email.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`)
      .order('last_sign_in_at', { ascending: false, nullsFirst: false })
      .limit(50)
      .abortSignal(abort.signal)
      .then(({ data, error: queryError }) => {
        if (abort.signal.aborted) return
        if (queryError) {
          console.error('useAdminUsers:', queryError.message)
          setError('Recherche impossible')
        } else {
          const rows = (data ?? []) as Array<Record<string, unknown> & { organizations: { name: string } | null }>
          setUsers(rows.map((r) => ({
            id: r.id as string,
            auth_id: r.auth_id as string,
            email: r.email as string,
            first_name: r.first_name as string,
            last_name: r.last_name as string,
            role: r.role as 'auditor' | 'client',
            is_active: r.is_active as boolean,
            is_platform_owner: (r.is_platform_owner as boolean) ?? false,
            last_sign_in_at: r.last_sign_in_at as string | null,
            organization_id: r.organization_id as string,
            organization_name: r.organizations?.name ?? '—',
          })))
        }
        setLoading(false)
      })

    return () => abort.abort()
  }, [query, tick])

  return { users, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
