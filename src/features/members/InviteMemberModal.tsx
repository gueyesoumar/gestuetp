import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { usePlatformRoles } from './usePlatformRoles'
import { useInviteMember } from './useInviteMember'
import { useAuth } from '../../hooks/useAuth'

interface InviteMemberModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function InviteMemberModal({ open, onClose, onSuccess }: InviteMemberModalProps) {
  const { profile } = useAuth()
  const { roles } = usePlatformRoles()
  const { inviteMember, inviting, error } = useInviteMember(() => {
    onSuccess()
    onClose()
  })

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [roleId, setRoleId] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!profile?.organization_id) return

    await inviteMember({
      email,
      first_name: firstName,
      last_name: lastName,
      role_id: roleId,
      organization_id: profile.organization_id,
    })
  }

  const handleClose = () => {
    setEmail('')
    setFirstName('')
    setLastName('')
    setRoleId('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Inviter un membre">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorAlert message={error} />}

        <div>
          <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            disabled={inviting}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="invite-firstname" className="block text-sm font-medium text-gray-700">
              Pr&eacute;nom
            </label>
            <input
              id="invite-firstname"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
              disabled={inviting}
            />
          </div>
          <div>
            <label htmlFor="invite-lastname" className="block text-sm font-medium text-gray-700">
              Nom
            </label>
            <input
              id="invite-lastname"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
              disabled={inviting}
            />
          </div>
        </div>

        <div>
          <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
            R&ocirc;le
          </label>
          <select
            id="invite-role"
            required
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            disabled={inviting}
          >
            <option value="">S&eacute;lectionner un r&ocirc;le</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-forest-50 hover:border-forest-300 transition-colors"
            disabled={inviting}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={inviting}
            className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900 disabled:opacity-50"
          >
            {inviting ? 'Invitation...' : 'Inviter'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
