import { useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useCreateSupportRequest } from './useSupportRequests'
import { demandeTypesForRole, type DemandeTypeOption } from '../../lib/constants'
import type { User } from '../../types/database.types'

interface Props {
  profile: User
  /** Cabinet auquel rattacher une demande de type REQUEST (null pour un client : seul l'ACT reset mdp lui est propose). */
  cabinetId: string | null
  missionId: string | null
  onBack: () => void
}

export function DemandeForm({ profile, cabinetId, missionId, onBack }: Props): JSX.Element {
  const role = profile.role === 'client' ? 'client' : 'auditor'
  const types = demandeTypesForRole(role)
  const [selected, setSelected] = useState<DemandeTypeOption | null>(null)
  const [detail, setDetail] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const { create } = useCreateSupportRequest()

  const submit = async (): Promise<void> => {
    if (!selected) return
    setBusy(true)
    setLocalError(null)

    if (selected.handling === 'act') {
      // Action immediate (reset mdp) : email Supabase, sans creation de ticket.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/set-password`,
      })
      setBusy(false)
      if (resetError) {
        console.error('resetPasswordForEmail:', resetError.message)
        setLocalError('Envoi impossible pour le moment. Veuillez reessayer.')
        return
      }
      setDone('Un email de réinitialisation vient de vous être envoyé.')
      return
    }

    if (!cabinetId) {
      setBusy(false)
      setLocalError('Demande indisponible dans ce contexte.')
      return
    }
    const res = await create({
      nature: 'demande', subtype: selected.subtype, status: 'open', title: selected.label,
      body: detail || null, requester_user_id: profile.id, cabinet_id: cabinetId, mission_id: missionId,
      role_at_submit: role, context: { routedTo: selected.routedTo ?? null },
    })
    setBusy(false)
    if (!res.ok) { setLocalError('Envoi impossible pour le moment. Veuillez reessayer.'); return }
    setDone('Votre demande a bien été transmise.')
  }

  if (done) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <CheckCircle2 size={40} className="text-forest-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-900 mb-1">C&apos;est envoy&eacute;</p>
        <p className="text-xs text-gray-500 mb-5">{done}</p>
        <button onClick={onBack} className="px-4 py-2 bg-forest-700 text-white rounded-lg text-sm font-semibold hover:bg-forest-900">
          Retour au centre d&apos;aide
        </button>
      </div>
    )
  }

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 hover:text-gray-600">
        <ArrowLeft size={15} /> Centre d&apos;aide
      </button>
      <h1 className="text-lg font-bold text-gray-900 mb-4">Faire une demande</h1>

      <div className="space-y-2 mb-4">
        {types.map((t) => (
          <button
            key={t.subtype}
            onClick={() => setSelected(t)}
            className={`w-full text-left border rounded-xl p-3.5 transition-colors ${
              selected?.subtype === t.subtype ? 'border-forest-500 bg-forest-50' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">{t.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
          </button>
        ))}
      </div>

      {selected && selected.handling === 'request' && (
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">Pr&eacute;cision (optionnel)</label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
            placeholder="Donnez un peu de contexte&hellip;"
          />
        </div>
      )}

      {localError && <p className="text-xs text-red-500 mb-3">{localError}</p>}

      <button
        onClick={() => void submit()}
        disabled={!selected || busy}
        className="px-5 py-2.5 bg-forest-700 text-white rounded-lg text-sm font-semibold hover:bg-forest-900 disabled:opacity-50"
      >
        {busy ? 'Envoi…' : 'Envoyer la demande'}
      </button>
    </div>
  )
}
