import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { PlatformRolePermissions } from '../types/database.types'

/**
 * Permissions cabinet de l'utilisateur courant, agrégées en OR sur tous ses
 * platform_roles. Suit le schéma défini par la migration 00082.
 *
 * Le flag is_platform_owner accorde toutes les permissions (override).
 *
 * Cohérence : ces booléens reflètent l'état utilisé côté serveur via
 * has_cabinet_permission() ; ils servent à masquer/disabler les boutons UI.
 * La sécurité réelle est imposée par les RLS et edge functions, jamais par
 * cette lecture client-side.
 */
export interface CabinetPermissions {
  canCreateMission: boolean
  canAssignTeam: boolean
  canBeLead: boolean
  canDesignateLead: boolean
  canDeleteMission: boolean
  canManageMembers: boolean
  canManageClients: boolean
  canEditOrganization: boolean
  canManageRoles: boolean
  loading: boolean
}

const DEFAULT_PERMS: Omit<CabinetPermissions, 'loading'> = {
  canCreateMission: false,
  canAssignTeam: false,
  canBeLead: false,
  canDesignateLead: false,
  canDeleteMission: false,
  canManageMembers: false,
  canManageClients: false,
  canEditOrganization: false,
  canManageRoles: false,
}

const ALL_TRUE: Omit<CabinetPermissions, 'loading'> = {
  canCreateMission: true,
  canAssignTeam: true,
  canBeLead: true,
  canDesignateLead: true,
  canDeleteMission: true,
  canManageMembers: true,
  canManageClients: true,
  canEditOrganization: true,
  canManageRoles: true,
}

export function useCabinetPermissions(): CabinetPermissions {
  const { profile } = useAuth()
  const [perms, setPerms] = useState<Omit<CabinetPermissions, 'loading'>>(DEFAULT_PERMS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) {
      setPerms(DEFAULT_PERMS)
      setLoading(false)
      return
    }

    // Override platform_owner : toutes les permissions
    if (profile.is_platform_owner) {
      setPerms(ALL_TRUE)
      setLoading(false)
      return
    }

    const controller = new AbortController()

    supabase
      .from('user_platform_roles')
      .select('platform_roles(permissions)')
      .eq('user_id', profile.id)
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (controller.signal.aborted) return
        if (error) {
          console.warn('useCabinetPermissions:', error.message)
          setPerms(DEFAULT_PERMS)
          setLoading(false)
          return
        }

        // OR-aggregate sur tous les rôles assignés
        const acc = { ...DEFAULT_PERMS }
        for (const row of data ?? []) {
          const role = row.platform_roles as unknown as { permissions: PlatformRolePermissions } | null
          const p = role?.permissions
          if (!p) continue
          if (p.can_create_mission) acc.canCreateMission = true
          if (p.can_assign_team) acc.canAssignTeam = true
          if (p.can_be_lead) acc.canBeLead = true
          if (p.can_designate_lead) acc.canDesignateLead = true
          if (p.can_delete_mission) acc.canDeleteMission = true
          if (p.can_manage_members) acc.canManageMembers = true
          if (p.can_manage_clients) acc.canManageClients = true
          if (p.can_edit_organization) acc.canEditOrganization = true
          if (p.can_manage_roles) acc.canManageRoles = true
        }

        setPerms(acc)
        setLoading(false)
      })

    return () => controller.abort()
  }, [profile?.id, profile?.is_platform_owner])

  return { ...perms, loading }
}
