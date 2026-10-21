import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
import { useToast } from '../../hooks/useToast'
import { Modal } from '../../components/ui/Modal'

const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-500 focus:ring-1 focus:ring-forest-500'
const label = 'block text-[12px] font-medium text-gray-600 mb-1'

/** Invite un contact de la societe candidate au portail d'auto-evaluation (RFC 0020 Lot 3a). */
export function InviteCandidateModal({ relationshipId, onClose }: { relationshipId: string; onClose: () => void }): JSX.Element {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const submit = async (): Promise<void> => {
    if (!name.trim() || !email.trim()) return
    setBusy(true)
    const { data, error } = await supabase.functions.invoke('invite-vendor-candidate', {
      body: { relationship_id: relationshipId, contact_name: name, email },
    })
    setBusy(false)
    if (error || (data as { error?: string })?.error) {
      toast.error('Invitation impossible', await readInvokeError(error, data, 'Erreur'))
      return
    }
    toast.success('Invitation envoyée', { description: email })
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Inviter le candidat">
      <div className="space-y-3">
        <p className="text-[12.5px] text-gray-500">Le contact recevra un accès au portail pour compléter l&apos;auto-évaluation.</p>
        <div><label className={label}>Nom du contact <span className="text-red-500">*</span></label><input className={field} value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div><label className={label}>Email <span className="text-red-500">*</span></label><input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <button onClick={onClose} disabled={busy} className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-500 hover:text-gray-700">Annuler</button>
        <button onClick={() => void submit()} disabled={busy || !name.trim() || !email.trim()} className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50">{busy ? 'Envoi...' : 'Inviter'}</button>
      </div>
    </Modal>
  )
}
