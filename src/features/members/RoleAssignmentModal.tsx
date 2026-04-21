import { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { Badge } from '../../components/ui/Badge'
import { PermissionBadges } from './PermissionBadges'
import { usePlatformRoles } from './usePlatformRoles'
import { useAssignRole } from './useAssignRole'
import type { MemberWithRoles } from './types'

interface RoleAssignmentModalProps {
  member: MemberWithRoles
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RoleAssignmentModal({ member, open, onClose, onSuccess }: RoleAssignmentModalProps) {
  const { roles } = usePlatformRoles()
  const { assignRole, assigning, error } = useAssignRole(() => {
    onSuccess()
    onClose()
  })

  const currentRoleIds = new Set(member.roles.map((r) => r.id))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(currentRoleIds))

  const toggleRole = useCallback((roleId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(roleId)) {
        next.delete(roleId)
      } else {
        next.add(roleId)
      }
      return next
    })
  }, [])

  const hasChanged = (() => {
    if (selectedIds.size !== currentRoleIds.size) return true
    for (const id of selectedIds) {
      if (!currentRoleIds.has(id)) return true
    }
    return false
  })()

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    if (!hasChanged) return

    // Find roles to add and remove
    const toAdd = [...selectedIds].filter((id) => !currentRoleIds.has(id))
    const toRemove = [...currentRoleIds].filter((id) => !selectedIds.has(id))

    // Process sequentially
    for (const roleId of toRemove) {
      await assignRole({ user_id: member.id, role_id: roleId, remove_role_id: roleId })
    }
    for (const roleId of toAdd) {
      await assignRole({ user_id: member.id, role_id: roleId })
    }
  }

  const handleClose = (): void => {
    setSelectedIds(new Set(currentRoleIds))
    onClose()
  }

  const previewedRole = roles.find((r) => selectedIds.has(r.id) && !currentRoleIds.has(r.id))

  return (
    <Modal open={open} onClose={handleClose} title={`R\u00f4les \u2014 ${member.first_name} ${member.last_name}`}>
      {error && <ErrorAlert message={error} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Current roles */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">R&ocirc;les actuels</p>
          {member.roles.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {member.roles.map((role) => (
                <Badge key={role.id} label={role.name} variant="blue" />
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-400">Aucun r&ocirc;le attribu&eacute;</span>
          )}
        </div>

        {/* Multi-role selector */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">S&eacute;lectionner les r&ocirc;les</p>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {roles.map((role) => {
              const isSelected = selectedIds.has(role.id)
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    isSelected
                      ? 'border-forest-300 bg-forest-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={assigning}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded border ${
                    isSelected
                      ? 'border-forest-600 bg-forest-600'
                      : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{role.name}</p>
                    {role.description && (
                      <p className="text-xs text-gray-500 truncate">{role.description}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Permission preview for newly selected role */}
        {previewedRole && (
          <div className="rounded-lg border border-forest-200 bg-forest-50 p-3">
            <p className="text-xs font-medium text-forest-700 mb-2">
              Permissions de &laquo;&nbsp;{previewedRole.name}&nbsp;&raquo;
            </p>
            <PermissionBadges permissions={previewedRole.permissions} />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-forest-50 hover:border-forest-300 transition-colors"
            disabled={assigning}>
            Annuler
          </button>
          <button type="submit" disabled={assigning || !hasChanged}
            className="rounded-md bg-forest-700 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900 disabled:opacity-50 transition-colors">
            {assigning ? 'Attribution...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
