import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'

/**
 * Tâches de « Prise en main » (onboarding Phase 2), COMPOSÉES par les permissions
 * (admin vs membre) et par PORTÉE :
 *  - portée utilisateur (personnelle) : sécuriser le compte, compléter le profil ;
 *  - portée cabinet (vérité partagée) : personnaliser, inviter, 1er client, 1re mission.
 *
 * Règle d'or : la complétion se lit sur l'ÉTAT réel (logo présent, comptes,
 * profil) — jamais un booléen « j'ai fait cette étape ». Un nouvel admin sur un
 * cabinet déjà monté ne voit donc que ses tâches personnelles.
 */
export interface OnboardingTask {
  key: string
  label: string
  done: boolean
  to: string
}

export interface OnboardingState {
  loading: boolean
  tasks: OnboardingTask[]
  doneCount: number
  totalCount: number
}

interface CabinetData {
  orgHasLogo: boolean
  members: number
  clients: number
  missions: number
}

export function useOnboardingTasks(): OnboardingState {
  const { profile } = useAuth()
  const perms = useCabinetPermissions()
  const [data, setData] = useState<CabinetData | null>(null)
  const [loading, setLoading] = useState(true)

  const isClient = profile?.role === 'client'
  const orgId = profile?.organization_id ?? null
  const { canEditOrganization, canManageMembers, canManageClients, canCreateMission } = perms

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      if (!orgId || perms.loading) return
      if (isClient) {
        setData({ orgHasLogo: false, members: 0, clients: 0, missions: 0 })
        setLoading(false)
        return
      }
      const [org, members, clients, missions] = await Promise.all([
        canEditOrganization
          ? supabase.from('organizations').select('logo_url').eq('id', orgId).abortSignal(controller.signal).maybeSingle()
          : Promise.resolve({ data: null }),
        canManageMembers
          ? supabase.from('users').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).neq('role', 'client').abortSignal(controller.signal)
          : Promise.resolve({ count: 0 }),
        canManageClients
          ? supabase.from('cabinet_clients').select('id', { count: 'exact', head: true }).eq('cabinet_id', orgId).eq('is_demo', false).abortSignal(controller.signal)
          : Promise.resolve({ count: 0 }),
        canCreateMission
          ? supabase.from('missions').select('id', { count: 'exact', head: true }).eq('cabinet_id', orgId).eq('is_demo', false).abortSignal(controller.signal)
          : Promise.resolve({ count: 0 }),
      ])
      if (controller.signal.aborted) return
      setData({
        orgHasLogo: !!(org.data as { logo_url: string | null } | null)?.logo_url,
        members: (members as { count: number | null }).count ?? 0,
        clients: (clients as { count: number | null }).count ?? 0,
        missions: (missions as { count: number | null }).count ?? 0,
      })
      setLoading(false)
    })()
    return () => controller.abort()
  }, [orgId, isClient, perms.loading, canEditOrganization, canManageMembers, canManageClients, canCreateMission])

  const tasks = useMemo<OnboardingTask[]>(() => {
    if (!profile || !data) return []
    const list: OnboardingTask[] = [
      { key: 'secure', label: 'Sécuriser votre compte (2FA)', done: true, to: '/compte' },
      { key: 'profile', label: 'Compléter votre profil', done: !!(profile.job_title || profile.phone), to: '/compte' },
    ]
    if (profile.role !== 'client') {
      if (canEditOrganization) list.push({ key: 'org', label: 'Personnaliser votre cabinet', done: data.orgHasLogo, to: '/organisation' })
      if (canManageMembers) list.push({ key: 'team', label: 'Inviter votre équipe', done: data.members > 1, to: '/organisation?tab=membres' })
      if (canManageClients) list.push({ key: 'client', label: 'Ajouter votre premier client', done: data.clients > 0, to: '/clients/nouveau' })
      if (canCreateMission) list.push({ key: 'mission', label: 'Lancer votre première mission', done: data.missions > 0, to: '/missions/nouvelle' })
    }
    return list
  }, [profile, data, canEditOrganization, canManageMembers, canManageClients, canCreateMission])

  return {
    loading: loading || perms.loading,
    tasks,
    doneCount: tasks.filter((t) => t.done).length,
    totalCount: tasks.length,
  }
}
