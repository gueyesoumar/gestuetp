import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useOrganizationHierarchy } from './useOrganizationHierarchy'
import type { PlatformRolePermissions } from '../types/database.types'

export interface GroupPermissions {
  canViewSupervision: boolean
  canCreateCampaign: boolean
  canManageSubsidiaries: boolean
  canViewEntityDetail: boolean
  loading: boolean
}

/**
 * Returns group-specific permissions for the current user.
 *
 * Fallback logic:
 * - If org is NOT a group → all group permissions default to true
 *   (preserves existing behavior for cabinets)
 * - If org IS a group → reads permissions from platform_roles JSONB.
 *   If no group permission is set, defaults to false.
 */
export function useGroupPermissions(): GroupPermissions {
  const { profile } = useAuth()
  const { isGroup, loading: orgLoading } = useOrganizationHierarchy(profile?.organization_id)
  const [permissions, setPermissions] = useState<Omit<GroupPermissions, 'loading'>>({
    canViewSupervision: true,
    canCreateCampaign: true,
    canManageSubsidiaries: true,
    canViewEntityDetail: true,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orgLoading) return
    if (!profile?.id) { setLoading(false); return }

    // For non-group orgs, all group permissions are true (backward compatibility)
    if (!isGroup) {
      setPermissions({
        canViewSupervision: true,
        canCreateCampaign: false,
        canManageSubsidiaries: false,
        canViewEntityDetail: true,
      })
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
          console.warn('useGroupPermissions:', error.message)
          setLoading(false)
          return
        }

        // Merge permissions from all roles (OR logic — any role granting = granted)
        let viewSupervision = false
        let createCampaign = false
        let manageSubsidiaries = false
        let viewEntityDetail = false

        for (const row of data ?? []) {
          const role = row.platform_roles as unknown as { permissions: PlatformRolePermissions } | null
          if (!role?.permissions) continue

          if (role.permissions.can_view_supervision) viewSupervision = true
          if (role.permissions.can_create_campaign) createCampaign = true
          if (role.permissions.can_manage_subsidiaries) manageSubsidiaries = true
          if (role.permissions.can_view_entity_detail) viewEntityDetail = true
        }

        // If no roles have any group permissions set, default to all true
        // (first-time setup — admin hasn't configured group permissions yet)
        const hasAnyGroupPerm = (data ?? []).some((row) => {
          const role = row.platform_roles as unknown as { permissions: PlatformRolePermissions } | null
          if (!role?.permissions) return false
          return role.permissions.can_view_supervision !== undefined
            || role.permissions.can_create_campaign !== undefined
            || role.permissions.can_manage_subsidiaries !== undefined
            || role.permissions.can_view_entity_detail !== undefined
        })

        if (!hasAnyGroupPerm) {
          // No group permissions configured yet — allow all by default
          viewSupervision = true
          createCampaign = true
          manageSubsidiaries = true
          viewEntityDetail = true
        }

        setPermissions({
          canViewSupervision: viewSupervision,
          canCreateCampaign: createCampaign,
          canManageSubsidiaries: manageSubsidiaries,
          canViewEntityDetail: viewEntityDetail,
        })
        setLoading(false)
      })

    return () => controller.abort()
  }, [profile?.id, isGroup, orgLoading])

  return { ...permissions, loading }
}
