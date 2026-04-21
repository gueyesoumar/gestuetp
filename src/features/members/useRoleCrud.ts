import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { PlatformRolePermissions } from '../../types/database.types'

interface CreateRoleParams {
  name: string
  description: string | null
  permissions: PlatformRolePermissions
  is_default: boolean
}

interface UpdateRoleParams {
  id: string
  name: string
  description: string | null
  permissions: PlatformRolePermissions
  is_default: boolean
}

interface UseRoleCrudResult {
  createRole: (params: CreateRoleParams) => Promise<boolean>
  updateRole: (params: UpdateRoleParams) => Promise<boolean>
  deleteRole: (roleId: string) => Promise<boolean>
  saving: boolean
  deleting: boolean
  error: string | null
}

export function useRoleCrud(onSuccess?: () => void): UseRoleCrudResult {
  const { profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createRole = useCallback(async (params: CreateRoleParams): Promise<boolean> => {
    if (!profile?.organization_id) return false
    setSaving(true)
    setError(null)

    const { error: insertError } = await supabase
      .from('platform_roles')
      .insert({
        organization_id: profile.organization_id,
        name: params.name,
        description: params.description,
        permissions: params.permissions,
        is_default: params.is_default,
      })

    if (insertError) {
      console.error('useRoleCrud.create:', insertError.message)
      setError('Impossible de cr\u00e9er le r\u00f4le.')
      setSaving(false)
      return false
    }

    setSaving(false)
    onSuccess?.()
    return true
  }, [profile?.organization_id, onSuccess])

  const updateRole = useCallback(async (params: UpdateRoleParams): Promise<boolean> => {
    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('platform_roles')
      .update({
        name: params.name,
        description: params.description,
        permissions: params.permissions,
        is_default: params.is_default,
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('useRoleCrud.update:', updateError.message)
      setError('Impossible de modifier le r\u00f4le.')
      setSaving(false)
      return false
    }

    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  const deleteRole = useCallback(async (roleId: string): Promise<boolean> => {
    setDeleting(true)
    setError(null)

    const { error: deleteError } = await supabase
      .from('platform_roles')
      .delete()
      .eq('id', roleId)

    if (deleteError) {
      console.error('useRoleCrud.delete:', deleteError.message)
      setError('Impossible de supprimer le r\u00f4le. V\u00e9rifiez qu\u2019il n\u2019est plus attribu\u00e9.')
      setDeleting(false)
      return false
    }

    setDeleting(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { createRole, updateRole, deleteRole, saving, deleting, error }
}
