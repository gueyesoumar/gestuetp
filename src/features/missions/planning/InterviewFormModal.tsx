import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { MissionMemberRow } from '../useMissionDetail'
import type { ClientContact } from '../../../types/database.types'

interface InterviewFormModalProps {
  missionId: string
  members: MissionMemberRow[]
  actors: ClientContact[]
  onCreateInterview: (data: {
    mission_id: string; title: string; auditor_id: string
    scheduled_date: string; scheduled_time: string; duration_minutes: number
    location: string; notes: string
    topic_ids: string[]; actor_ids: string[]
  }) => Promise<boolean>
  onClose: () => void
  saving: boolean
  error: string | null
}

// Entretien simplifié (Niveau 1) : titre + auditeur + date + interlocuteurs + notes.
// Heure/durée/lieu/sujets retirés de l'UI ; les colonnes DB restent dormantes et
// reçoivent des valeurs par défaut pour ne pas casser le contrat de création.
export function InterviewFormModal({ missionId, members, actors, onCreateInterview, onClose, saving, error }: InterviewFormModalProps) {
  const [title, setTitle] = useState('')
  const [auditorId, setAuditorId] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedActorIds, setSelectedActorIds] = useState<Set<string>>(new Set())

  const auditorMembers = members.filter((m) => m.role === 'auditor' || m.role === 'lead_auditor')
  const canSubmit = title.trim().length > 0 && auditorId !== '' && date !== ''

  const toggleActor = (id: string): void => {
    setSelectedActorIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleSubmit = async (): Promise<void> => {
    if (!canSubmit) return
    const ok = await onCreateInterview({
      mission_id: missionId,
      title,
      auditor_id: auditorId,
      scheduled_date: date,
      scheduled_time: '09:00',
      duration_minutes: 60,
      location: '',
      notes,
      topic_ids: [],
      actor_ids: Array.from(selectedActorIds),
    })
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title="Planifier un entretien">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {error && <ErrorAlert message={error} />}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Titre de l&apos;entretien <span className="text-red-500">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Revue politique SSI avec le RSSI"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Auditeur <span className="text-red-500">*</span></label>
            <select value={auditorId} onChange={(e) => setAuditorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500">
              <option value="">S&eacute;lectionner...</option>
              {auditorMembers.map((a) => (
                <option key={a.user_id} value={a.user_id}>{a.user.first_name} {a.user.last_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Interlocuteurs <span className="text-gray-300">({selectedActorIds.size})</span>
          </label>
          {actors.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic">
              Aucun acteur. D&eacute;clarez-les dans l&rsquo;onglet &laquo; Acteurs &raquo; du cadrage.
            </p>
          ) : (
            <div className="border border-gray-200 rounded-lg max-h-[160px] overflow-y-auto">
              {actors.map((a) => (
                <label key={a.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-forest-50 cursor-pointer text-xs">
                  <input type="checkbox" checked={selectedActorIds.has(a.id)} onChange={() => toggleActor(a.id)}
                    className="rounded border-gray-300 accent-forest-700" />
                  <span className="text-gray-700">{a.name}</span>
                  {a.job_title && <span className="text-gray-400">· {a.job_title}</span>}
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optionnel)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Sujets &agrave; aborder, pr&eacute;paration..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500 resize-y" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50">Annuler</button>
          <button onClick={() => void handleSubmit()} disabled={!canSubmit || saving}
            className="px-5 py-2 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors">
            {saving ? 'Création...' : 'Planifier l’entretien'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
