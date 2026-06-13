import { useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useCreateSupportRequest } from './useSupportRequests'
import type { User } from '../../types/database.types'

interface Props {
  profile: User
  cabinetId: string
  missionId: string | null
  onBack: () => void
}

const MODULES = ['Missions', 'Portail client', 'Rapports', 'Planning', 'Référentiels', 'Général']

export function SuggestionForm({ profile, cabinetId, missionId, onBack }: Props): JSX.Element {
  const role = profile.role === 'client' ? 'client' : 'auditor'
  const [module, setModule] = useState(MODULES[0])
  const [idea, setIdea] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const { create, error } = useCreateSupportRequest()

  const submit = async (): Promise<void> => {
    const trimmed = idea.trim()
    if (!trimmed) return
    setBusy(true)
    const res = await create({
      nature: 'suggestion',
      title: trimmed.slice(0, 80),
      body: trimmed,
      requester_user_id: profile.id,
      cabinet_id: cabinetId,
      mission_id: missionId,
      role_at_submit: role,
      context: { module },
    })
    setBusy(false)
    if (res.ok) setDone(true)
  }

  if (done) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <CheckCircle2 size={40} className="text-forest-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-900 mb-1">Merci pour votre id&eacute;e&nbsp;!</p>
        <p className="text-xs text-gray-500 mb-5">
          Elle a &eacute;t&eacute; transmise &agrave; l&apos;&eacute;quipe produit.
        </p>
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
      <h1 className="text-lg font-bold text-gray-900 mb-1">Sugg&eacute;rer une am&eacute;lioration</h1>
      <p className="text-sm text-gray-500 mb-4">
        Transmise &agrave; l&apos;&eacute;quipe produit (sans d&eacute;lai garanti &mdash; ce n&apos;est pas un incident).
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">Module concern&eacute;</label>
          <select value={module} onChange={(e) => setModule(e.target.value)} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm">
            {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1.5">Votre id&eacute;e</label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
            placeholder="D&eacute;crivez l&apos;am&eacute;lioration souhait&eacute;e&hellip;"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          onClick={() => void submit()}
          disabled={!idea.trim() || busy}
          className="px-5 py-2.5 bg-forest-700 text-white rounded-lg text-sm font-semibold hover:bg-forest-900 disabled:opacity-50"
        >
          {busy ? 'Envoi…' : 'Envoyer la suggestion'}
        </button>
      </div>
    </div>
  )
}
