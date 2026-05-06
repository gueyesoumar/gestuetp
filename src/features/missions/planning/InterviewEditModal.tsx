import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { generateCompteRendu } from './interviewHelpers'
import { generateInterviewCRPDF } from '../../reports/generateInterviewCRPDF'
import { PvEditor } from './PvEditor'
import type { ClientContact, InterviewScheduleUpdate, PvNotes } from '../../../types/database.types'
import type { MissionMemberRow } from '../useMissionDetail'
import type { AuditTopicWithControls } from './useAuditTopics'
import type { InterviewWithRelations } from './usePlanningData'

interface InterviewEditModalProps {
  interview: InterviewWithRelations
  members: MissionMemberRow[]
  actors: ClientContact[]
  topics: AuditTopicWithControls[]
  missionName: string
  onUpdate: (id: string, data: InterviewScheduleUpdate) => Promise<boolean>
  onSyncTopics: (interviewId: string, topicIds: string[]) => Promise<boolean>
  onSyncActors: (interviewId: string, actorIds: string[]) => Promise<boolean>
  onClose: () => void
  saving: boolean
  error: string | null
}

export function InterviewEditModal({
  interview, members, actors, topics, missionName,
  onUpdate, onSyncTopics, onSyncActors, onClose, saving, error,
}: InterviewEditModalProps) {
  const [title, setTitle] = useState(interview.title)
  const [auditorId, setAuditorId] = useState(interview.auditor_id)
  const [date, setDate] = useState(interview.scheduled_date)
  const [time, setTime] = useState(interview.scheduled_time.slice(0, 5))
  const [duration, setDuration] = useState(interview.duration_minutes)
  const [location, setLocation] = useState(interview.location ?? '')
  const [notes, setNotes] = useState(interview.notes ?? '')
  const [pvNotes, setPvNotes] = useState<PvNotes | null>(interview.pv_notes ?? null)
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set(interview.topic_ids))
  const [selectedActorIds, setSelectedActorIds] = useState<Set<string>>(new Set(interview.actor_ids))

  const auditorMembers = members.filter((m) => m.role === 'auditor' || m.role === 'lead_auditor')

  const handleSave = async (): Promise<void> => {
    const ok = await onUpdate(interview.id, {
      title,
      auditor_id: auditorId,
      scheduled_date: date,
      scheduled_time: time,
      duration_minutes: duration,
      location: location || null,
      notes: notes || null,
      pv_notes: pvNotes,
    })
    if (!ok) return
    const topicsOk = await onSyncTopics(interview.id, Array.from(selectedTopicIds))
    const actorsOk = await onSyncActors(interview.id, Array.from(selectedActorIds))
    if (topicsOk && actorsOk) onClose()
  }

  const toggleTopic = (id: string) => {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleActor = (id: string) => {
    setSelectedActorIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleGenerateCR = (): void => {
    if (!notes.trim()) return
    const auditor = members.find((m) => m.user_id === auditorId)
    const auditorName = auditor ? `${auditor.user.first_name} ${auditor.user.last_name}` : 'Auditeur'
    const firstActor = Array.from(selectedActorIds).map((id) => actors.find((a) => a.id === id)).find(Boolean)
    setNotes(generateCompteRendu(interview, firstActor, auditorName, notes))
  }

  const handlePdf = (): void => {
    const auditor = members.find((m) => m.user_id === auditorId)
    const auditorName = auditor ? `${auditor.user.first_name} ${auditor.user.last_name}` : 'Auditeur'
    const firstActor = Array.from(selectedActorIds).map((id) => actors.find((a) => a.id === id)).find(Boolean)
    const topicNames = Array.from(selectedTopicIds)
      .map((id) => topics.find((t) => t.id === id)?.name)
      .filter((n): n is string => Boolean(n))
    generateInterviewCRPDF({ interview, contact: firstActor, auditorName, missionName, rawNotes: notes, controlCodes: topicNames })
  }

  return (
    <Modal open onClose={onClose} title="Modifier l&rsquo;entretien">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {error && <ErrorAlert message={error} />}

        <Field label="Titre">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
          </Field>
          <Field label="Heure">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
          </Field>
          <Field label="Dur&eacute;e">
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500">
              <option value={30}>30 min</option>
              <option value={60}>1h</option>
              <option value={90}>1h30</option>
              <option value={120}>2h</option>
              <option value={180}>3h</option>
            </select>
          </Field>
        </div>

        <Field label="Auditeur">
          <select value={auditorId} onChange={(e) => setAuditorId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500">
            {auditorMembers.map((a) => (
              <option key={a.user_id} value={a.user_id}>{a.user.first_name} {a.user.last_name}</option>
            ))}
          </select>
        </Field>

        <Field label="Lieu">
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Salle, visio..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
        </Field>

        {/* Acteurs convoqu&eacute;s */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Acteurs convoqu&eacute;s <span className="text-gray-300">({selectedActorIds.size})</span>
          </label>
          {actors.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic">Aucun acteur d&eacute;clar&eacute; pour cette mission. Ajoutez-les dans l&rsquo;onglet &laquo; Acteurs &raquo; du cadrage.</p>
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

        {/* Sujets couverts */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Sujets couverts <span className="text-gray-300">({selectedTopicIds.size})</span>
          </label>
          {topics.length === 0 ? (
            <p className="text-[11px] text-gray-400 italic">Aucun sujet disponible pour ce r&eacute;f&eacute;rentiel.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg max-h-[200px] overflow-y-auto">
              {topics.map((t) => (
                <label key={t.id} className="flex items-start gap-2 px-3 py-1.5 hover:bg-gold-50 cursor-pointer text-xs">
                  <input type="checkbox" checked={selectedTopicIds.has(t.id)} onChange={() => toggleTopic(t.id)}
                    className="mt-0.5 rounded border-gray-300 accent-gold-500" />
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-700 font-medium">{t.name}</span>
                    <span className="ml-1.5 text-[10px] text-gold-700">({t.control_ids.length} ctrl)</span>
                    {t.description && <p className="text-[10px] text-gray-400 mt-0.5">{t.description}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* PV pré-rempli structuré */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">PV pr&eacute;-rempli (par sujet)</label>
          <PvEditor
            template={interview.pv_template}
            notes={pvNotes}
            onChange={setPvNotes}
          />
        </div>

        {/* Notes libres / synthèse globale */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-700">Synth&egrave;se globale</label>
            <div className="flex gap-1.5">
              <button type="button" onClick={handleGenerateCR} disabled={!notes.trim()}
                className="text-[10px] font-semibold text-white bg-purple-500 px-2.5 py-1 rounded-lg hover:bg-purple-600 disabled:opacity-30 transition-colors">
                ✳ G&eacute;n&eacute;rer le CR
              </button>
              <button type="button" onClick={handlePdf} disabled={!notes.trim()}
                className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 disabled:opacity-30 transition-colors">
                📄 PDF
              </button>
            </div>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6}
            placeholder="Saisissez vos notes brutes puis cliquez sur G&eacute;n&eacute;rer le CR pour les structurer."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500 resize-y leading-relaxed font-mono" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50">Annuler</button>
          <button onClick={() => void handleSave()} disabled={saving || !title.trim()}
            className="px-5 py-2 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors">
            {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
