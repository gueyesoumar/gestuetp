import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useResetPassword } from './useResetPassword'
import type { MemberWithRoles } from './types'

interface ResetPasswordModalProps {
  member: MemberWithRoles
  open: boolean
  onClose: () => void
}

export function ResetPasswordModal({ member, open, onClose }: ResetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mismatch, setMismatch] = useState(false)
  const [success, setSuccess] = useState(false)

  const { resetPassword, resetting, error } = useResetPassword(() => {
    setSuccess(true)
  })

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setMismatch(false)
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setMismatch(true)
      return
    }

    await resetPassword(member.id, newPassword)
  }

  const handleClose = (): void => {
    setNewPassword('')
    setConfirmPassword('')
    setMismatch(false)
    setSuccess(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Mot de passe \u2014 ${member.first_name} ${member.last_name}`}>
      {error && <ErrorAlert message={error} />}
      {mismatch && <ErrorAlert message="Les mots de passe ne correspondent pas." />}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-[13px] text-green-700 mb-4">
          Mot de passe modifi&eacute; avec succ&egrave;s.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-pw" className="block text-sm font-medium text-gray-700">
            Nouveau mot de passe
          </label>
          <input
            id="reset-pw"
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            disabled={resetting}
            placeholder="8 caract&egrave;res minimum"
          />
        </div>

        <div>
          <label htmlFor="reset-pw-confirm" className="block text-sm font-medium text-gray-700">
            Confirmer le mot de passe
          </label>
          <input
            id="reset-pw-confirm"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            disabled={resetting}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
            disabled={resetting}
          >
            Fermer
          </button>
          <button
            type="submit"
            disabled={resetting || !newPassword || !confirmPassword}
            className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900 disabled:opacity-50"
          >
            {resetting ? 'Modification...' : 'Modifier le mot de passe'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
