import { useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { useRecorder, type RecordedEvent } from './RecorderContext'
import { useCreateSupportRequest } from '../useSupportRequests'
import type { User } from '../../../types/database.types'

interface Props {
  profile: User
  cabinetId: string
  missionId: string | null
  onDone: () => void
}

const ICON: Record<RecordedEvent['kind'], string> = { click: '🖱', nav: '🧭', error: '⛔' }

export function BugRecapForm({ profile, cabinetId, missionId, onDone }: Props): JSX.Element {
  const recorder = useRecorder()
  const role = profile.role === 'client' ? 'client' : 'auditor'
  const [steps, setSteps] = useState<RecordedEvent[]>(recorder.lastTrace ?? [])
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const { create, error } = useCreateSupportRequest()

  const submit = async (): Promise<void> => {
    setBusy(true)
    const firstError = steps.find((s) => s.kind === 'error')
    const res = await create({
      nature: 'bug',
      title: firstError ? `Bug — ${(firstError.detail ?? 'erreur').slice(0, 60)}` : 'Signalement de bug',
      body: comment || null,
      requester_user_id: profile.id,
      cabinet_id: cabinetId,
      mission_id: missionId,
      role_at_submit: role,
      context: { steps, build: __BUILD_SHA__ },
    })
    setBusy(false)
    // On garde lastTrace jusqu'au retour : sinon le parent remplace ce formulaire
    // (condition lastTrace) avant d'afficher le succes.
    if (res.ok) setDone(true)
  }

  if (done) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <CheckCircle2 size={40} className="text-forest-600 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-900 mb-1">Signalement envoy&eacute;</p>
        <p className="text-xs text-gray-500 mb-5">La reproduction a &eacute;t&eacute; jointe&nbsp;: notre &eacute;quipe a tout pour diagnostiquer.</p>
        <button onClick={() => { recorder.clearTrace(); onDone() }} className="px-4 py-2 bg-forest-700 text-white rounded-lg text-sm font-semibold hover:bg-forest-900">
          Retour au centre d&apos;aide
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Voici ce qu&apos;on a enregistr&eacute;</p>
        <p className="text-xs text-gray-400 mt-0.5">V&eacute;rifiez, retirez une &eacute;tape si besoin, puis envoyez.</p>
      </div>
      <div className="divide-y divide-gray-50">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-2.5 px-4 py-2.5 ${s.kind === 'error' ? 'bg-red-50/50' : ''}`}>
            <span className="w-5 text-center">{ICON[s.kind]}</span>
            <span className={`flex-1 font-mono text-[11.5px] ${s.kind === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
              {s.detail ?? s.label}
            </span>
            <button onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-gray-100">
        <label className="text-xs font-semibold text-gray-700 block mb-1.5">Un commentaire&nbsp;? (optionnel)</label>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg p-2.5 text-sm" />
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <div className="flex gap-2 mt-3">
          <button onClick={recorder.clearTrace} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">
            Recommencer
          </button>
          <button onClick={() => void submit()} disabled={busy || steps.length === 0} className="px-5 py-2.5 bg-forest-700 text-white rounded-lg text-sm font-semibold hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'Envoi…' : 'Envoyer le signalement'}
          </button>
        </div>
      </div>
    </div>
  )
}
