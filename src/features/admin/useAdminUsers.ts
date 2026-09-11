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

export function useAdminUsers(): Result {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const abort = new AbortController()

    // Charge tous les utilisateurs (cross-cabinet) ; le filtrage se fait côté page.
    // SANS embed organizations(...) : l'embed PostgREST échouait et laissait la
    // liste vide. Les noms d'organisation sont chargés dans une 2e requête.
    void (async () => {
      const { data, error: queryError } = await supabase
        .from('users')
        .select('id, auth_id, email, first_name, last_name, role, is_active, is_platform_owner, last_sign_in_at, organization_id')
        .order('last_sign_in_at', { ascending: false, nullsFirst: false })
        .limit(500)
        .abortSignal(abort.signal)
      if (abort.signal.aborted) return
      if (queryError) {
        console.error('useAdminUsers:', queryError.message)
        setError('Chargement impossible')
        setLoading(false)
        return
      }

      const rows = (data ?? []) as Array<Record<string, unknown>>
      const orgIds = [...new Set(rows.map((r) => r.organization_id as string).filter(Boolean))]
      const orgNames = new Map<string, string>()
      if (orgIds.length > 0) {
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds)
          .abortSignal(abort.signal)
        for (const o of (orgs ?? []) as Array<{ id: string; name: string }>) orgNames.set(o.id, o.name)
      }
      if (abort.signal.aborted) return

      setError(null)
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
        organization_name: orgNames.get(r.organization_id as string) ?? '—',
      })))
      setLoading(false)
    })()

    return () => abort.abort()
  }, [tick])

  return { users, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
