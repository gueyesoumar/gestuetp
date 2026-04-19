import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { Badge } from '../../components/ui/Badge'
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

  const currentRole = member.roles[0] ?? null
  const [selectedRoleId, setSelectedRoleId] = useState(currentRole?.id ?? '')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedRoleId || selectedRoleId === currentRole?.id) return

    await assignRole({
      user_id: member.id,
      role_id: selectedRoleId,
      remove_role_id: currentRole?.id,
    })
  }

  const handleClose = () => {
    setSelectedRoleId(currentRole?.id ?? '')
    onClose()
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId)
  const hasChanged = selectedRoleId !== (currentRole?.id ?? '')

  return (
    <Modal open={open} onClose={handleClose} title={`R\u00f4le \u2014 ${member.first_name} ${member.last_name}`}>
      {error && <ErrorAlert message={error} />}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Current role */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">R&ocirc;le actuel</p>
          {currentRole ? (
            <Badge label={currentRole.name} variant="blue" />
          ) : (
            <span className="text-sm text-gray-400">Aucun r&ocirc;le attribu&eacute;</span>
          )}
        </div>

        {/* Role selector */}
        <div>
          <label htmlFor="role-select" className="block text-xs font-medium text-gray-700 mb-1.5">
            {currentRole ? 'Changer le r\u00f4le' : 'Attribuer un r\u00f4le'}
          </label>
          <select
            id="role-select"
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            disabled={assigning}
          >
            <option value="">S&eacute;lectionner un r&ocirc;le</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>

          {selectedRole && selectedRole.description && (
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">{selectedRole.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose}
            className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50">
            Annuler
          </button>
          <button type="submit" disabled={assigning || !hasChanged || !selectedRoleId}
            className="px-5 py-2 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors">
            {assigning ? 'Attribution...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
