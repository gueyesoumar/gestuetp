import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface AdminUserDetail {
  id: string
  auth_id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  job_title: string | null
  is_active: boolean
  is_platform_owner: boolean
  role: 'auditor' | 'client'
  last_sign_in_at: string | null
  created_at: string
  organization: {
    id: string
    name: string
    slug: string
    types: string[]
    is_active: boolean
  }
  platform_roles: Array<{ id: string; name: string }>
  missions_assigned: Array<{ id: string; name: string; status: string; cabinet_id: string }>
  recent_admin_views: Array<{ id: string; admin_email: string; reason: string; started_at: string }>
}

interface Result {
  user: AdminUserDetail | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminUserDetail(userId: string | undefined): Result {
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const { data: u, error: uError } = await supabase
          .from('users')
          .select('id, auth_id, email, first_name, last_name, phone, job_title, is_active, is_platform_owner, role, last_sign_in_at, created_at, organizations(id, name, slug, types, is_active)')
          .eq('id', userId)
          .abortSignal(abort.signal)
          .single()
        if (uError || !u) throw uError ?? new Error('Utilisateur introuvable')

        const row = u as Record<string, unknown> & { organizations: { id: string; name: string; slug: string; types: string[]; is_active: boolean } }

        const { data: roles } = await supabase
          .from('user_platform_roles')
          .select('platform_roles(id, name)')
          .eq('user_id', userId)
          .abortSignal(abort.signal)
        const platformRoles = ((roles ?? []) as Array<{ platform_roles: { id: string; name: string } | null }>)
          .map((r) => r.platform_roles)
          .filter((r): r is { id: string; name: string } => r !== null)

        // Missions assignées (lead, associate, ou membre via mission_team)
        const { data: missionsLead } = await supabase
          .from('missions')
          .select('id, name, status, cabinet_id')
          .or(`lead_auditor_id.eq.${userId},associate_id.eq.${userId}`)
          .abortSignal(abort.signal)

        const { data: viewSessions } = await supabase
          .from('admin_view_sessions')
          .select('id, reason, started_at, admin:users!admin_view_sessions_admin_id_fkey(email)')
          .eq('target_user_id', userId)
          .order('started_at', { ascending: false })
          .limit(10)
          .abortSignal(abort.signal)

        if (abort.signal.aborted) return

        const recent = ((viewSessions ?? []) as Array<{ id: string; reason: string; started_at: string; admin: { email: string } | null }>)
          .map((v) => ({
            id: v.id,
            admin_email: v.admin?.email ?? '—',
            reason: v.reason,
            started_at: v.started_at,
          }))

        setUser({
          id: row.id as string,
          auth_id: row.auth_id as string,
          email: row.email as string,
          first_name: row.first_name as string,
          last_name: row.last_name as string,
          phone: row.phone as string | null,
          job_title: row.job_title as string | null,
          is_active: row.is_active as boolean,
          is_platform_owner: (row.is_platform_owner as boolean) ?? false,
          role: row.role as 'auditor' | 'client',
          last_sign_in_at: row.last_sign_in_at as string | null,
          created_at: row.created_at as string,
          organization: row.organizations,
          platform_roles: platformRoles,
          missions_assigned: ((missionsLead ?? []) as Array<{ id: string; name: string; status: string; cabinet_id: string }>),
          recent_admin_views: recent,
        })
        setLoading(false)
      } catch (err) {
        if (abort.signal.aborted) return
        console.error('useAdminUserDetail:', err)
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
        setLoading(false)
      }
    })()

    return () => abort.abort()
  }, [userId, tick])

  return { user, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
