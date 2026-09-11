import { useState } from 'react'
import type { FormEvent } from 'react'
import { Modal } from '../../components/ui/Modal'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'

/**
 * Ajout d'un membre à une organisation existante, par le super-admin (edge
 * admin-add-member). Le membre reçoit le rôle « Associé » (administrateur, toutes
 * permissions) et un email brandé de définition de mot de passe.
 */
interface Props {
  organizationId: string
  organizationName: string
  open: boolean
  onClose: () => void
  onAdded: () => void
}

export function AddMemberModal({ organizationId, organizationName, open, onClose, onAdded }: Props): JSX.Element {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<boolean | null>(null)

  const reset = (): void => {
    setFirstName(''); setLastName(''); setEmail(''); setReason('')
    setError(null); setSent(null); setSubmitting(false)
  }
  const close = (): void => {
    const didAdd = sent !== null
    reset()
    onClose()
    // Refetch APRÈS fermeture (le hook repasse en loading → éviterait le succès).
    if (didAdd) onAdded()
  }

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const res = await invokeEdgeFunction<{ invitation_sent?: boolean }>('admin-add-member', {
      organization_id: organizationId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      reason: reason.trim(),
    })
    setSubmitting(false)
    if (!res.ok) {
      setError(res.error ?? 'Ajout impossible')
      return
    }
    setSent(res.data?.invitation_sent ?? false)
  }

  const inputCls = 'mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100'

  return (
    <Modal open={open} onClose={close} title={`Ajouter un membre — ${organizationName}`}>
      {error && <ErrorAlert message={error} />}
      {sent !== null ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-green-50 p-3 text-[13px] text-green-700">
            Membre ajouté avec le rôle <strong>Associé</strong> (administrateur).
            {sent ? ' Un email de définition de mot de passe lui a été envoyé.' : ' ⚠️ L\'email n\'a pas pu être envoyé — communiquez-lui le lien autrement (RESEND_API_KEY ?).'}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={close} className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-900">Fermer</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="am-first" className="block text-[13px] font-medium text-gray-700">Prénom</label>
              <input id="am-first" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={submitting} className={inputCls} />
            </div>
            <div>
              <label htmlFor="am-last" className="block text-[13px] font-medium text-gray-700">Nom</label>
              <input id="am-last" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={submitting} className={inputCls} />
            </div>
          </div>
          <div>
            <label htmlFor="am-email" className="block text-[13px] font-medium text-gray-700">Email</label>
            <input id="am-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} className={inputCls} placeholder="prenom.nom@exemple.com" />
          </div>
          <div>
            <label htmlFor="am-reason" className="block text-[13px] font-medium text-gray-700">Motif (audité)</label>
            <input id="am-reason" type="text" required value={reason} onChange={(e) => setReason(e.target.value)} disabled={submitting} className={inputCls} placeholder="Ex. : nouvel administrateur du cabinet" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={close} disabled={submitting} className="rounded-lg border border-gray-200 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50 disabled:opacity-50">Annuler</button>
            <button type="submit" disabled={submitting || !firstName || !lastName || !email || !reason} className="rounded-md bg-forest-700 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-forest-900 disabled:opacity-50">
              {submitting ? 'Ajout…' : 'Ajouter le membre'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
