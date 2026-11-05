import { useState, lazy, Suspense } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { generateCompteRendu } from './interviewHelpers'
import { loadReportTemplateForMission } from '../../reports/loadReportTemplate'
import type { CRData } from '../../reports/interview-cr'
import type { ClientContact, InterviewScheduleUpdate } from '../../../types/database.types'
import type { MissionMemberRow } from '../useMissionDetail'
import type { InterviewWithRelations } from './usePlanningData'

const InterviewCRV2Modal = lazy(() => import('../../reports/interview-cr-v2/InterviewCRV2Modal'))
type CRPreview = CRData & { templateSections?: { key: string; visible: boolean; options?: Record<string, unknown> }[] | null; templateTexts?: Record<string, string> | null }

interface InterviewEditModalProps {
  interview: InterviewWithRelations
  members: MissionMemberRow[]
  actors: ClientContact[]
  missionName: string
  onUpdate: (id: string, data: InterviewScheduleUpdate) => Promise<boolean>
  onSyncActors: (interviewId: string, actorIds: string[]) => Promise<boolean>
  onClose: () => void
  saving: boolean
  error: string | null
}

export function InterviewEditModal({
  interview, members, actors, missionName,
  onUpdate, onSyncActors, onClose, saving, error,
}: InterviewEditModalProps) {
  const [title, setTitle] = useState(interview.title)
  const [auditorId, setAuditorId] = useState(interview.auditor_id)
  const [date, setDate] = useState(interview.scheduled_date)
  const [notes, setNotes] = useState(interview.notes ?? '')
  const [selectedActorIds, setSelectedActorIds] = useState<Set<string>>(new Set(interview.actor_ids))
  // Moteur de rapport react-pdf (RFC 0021 Lot 4) : jsPDF retire. Apercu in-app du CR.
  const [crPreview, setCrPreview] = useState<CRPreview | null>(null)

  const auditorMembers = members.filter((m) => m.role === 'auditor' || m.role === 'lead_auditor')

  const handleSave = async (): Promise<void> => {
    const ok = await onUpdate(interview.id, {
      title,
      auditor_id: auditorId,
      scheduled_date: date,
      notes: notes || null,
    })
    if (!ok) return
    const actorsOk = await onSyncActors(interview.id, Array.from(selectedActorIds))
    if (actorsOk) onClose()
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

  const handlePdf = async (): Promise<void> => {
    const auditor = members.find((m) => m.user_id === auditorId)
    const auditorName = auditor ? `${auditor.user.first_name} ${auditor.user.last_name}` : 'Auditeur'
    const firstActor = Array.from(selectedActorIds).map((id) => actors.find((a) => a.id === id)).find(Boolean)
    const base = { interview, contact: firstActor, auditorName, missionName, rawNotes: notes, controlCodes: [] as string[] }
    const tpl = await loadReportTemplateForMission(interview.mission_id, 'interview_cr')
    setCrPreview({ ...base, templateSections: tpl?.sections ?? null, templateTexts: tpl?.texts ?? null })
  }

  return (
    <>
    <Modal open onClose={onClose} title="Modifier l&rsquo;entretien">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {error && <ErrorAlert message={error} />}

        <Field label="Titre">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
          </Field>
          <Field label="Auditeur">
            <select value={auditorId} onChange={(e) => setAuditorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500">
              {auditorMembers.map((a) => (
                <option key={a.user_id} value={a.user_id}>{a.user.first_name} {a.user.last_name}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Interlocuteurs */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Interlocuteurs <span className="text-gray-300">({selectedActorIds.size})</span>
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
    {crPreview && (
      <Suspense fallback={null}>
        <InterviewCRV2Modal data={crPreview} onClose={() => setCrPreview(null)} />
      </Suspense>
    )}
    </>
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
