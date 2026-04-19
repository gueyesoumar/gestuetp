import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { generateCompteRendu, detectControls } from './interviewHelpers'
import { generateInterviewCRPDF } from '../../reports/generateInterviewCRPDF'
import type { InterviewSchedule, ClientContact, InterviewScheduleUpdate } from '../../../types/database.types'
import type { MissionMemberRow } from '../useMissionDetail'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'

interface InterviewEditModalProps {
  interview: InterviewSchedule
  members: MissionMemberRow[]
  contacts: ClientContact[]
  domains: DomainWithControls[]
  missionName: string
  onUpdate: (id: string, data: InterviewScheduleUpdate) => Promise<boolean>
  onClose: () => void
  saving: boolean
  error: string | null
}

export function InterviewEditModal({ interview, members, contacts, domains, missionName, onUpdate, onClose, saving, error }: InterviewEditModalProps) {
  const [title, setTitle] = useState(interview.title)
  const [auditorId, setAuditorId] = useState(interview.auditor_id)
  const [contactId, setContactId] = useState(interview.contact_id ?? '')
  const [date, setDate] = useState(interview.scheduled_date)
  const [time, setTime] = useState(interview.scheduled_time.slice(0, 5))
  const [duration, setDuration] = useState(interview.duration_minutes)
  const [location, setLocation] = useState(interview.location ?? '')
  const [notes, setNotes] = useState(interview.notes ?? '')
  const [selectedControlIds, setSelectedControlIds] = useState<Set<string>>(new Set(interview.control_ids))
  const [showControls, setShowControls] = useState(false)

  const auditors = members.filter((m) => m.role === 'auditor' || m.role === 'lead_auditor')

  const handleSave = async () => {
    const ok = await onUpdate(interview.id, {
      title,
      auditor_id: auditorId,
      contact_id: contactId || undefined,
      scheduled_date: date,
      scheduled_time: time,
      duration_minutes: duration,
      location: location || undefined,
      notes: notes || undefined,
      control_ids: Array.from(selectedControlIds),
    })
    if (ok) onClose()
  }

  const toggleControl = (id: string) => {
    setSelectedControlIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Modal open onClose={onClose} title="Modifier l&rsquo;entretien">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {error && <ErrorAlert message={error} />}

        {/* Title */}
        <Field label="Titre">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
        </Field>

        {/* Date + Time + Duration */}
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

        {/* Auditor + Contact */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Auditeur">
            <select value={auditorId} onChange={(e) => setAuditorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500">
              {auditors.map((a) => <option key={a.user_id} value={a.user_id}>{a.user.first_name} {a.user.last_name}</option>)}
            </select>
          </Field>
          <Field label="Interlocuteur">
            <select value={contactId} onChange={(e) => setContactId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500">
              <option value="">Aucun</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.job_title ? ` (${c.job_title})` : ''}</option>)}
            </select>
          </Field>
        </div>

        {/* Location */}
        <Field label="Lieu">
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Salle, visio..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
        </Field>

        {/* Compte-rendu / Notes */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-700">Compte-rendu / Notes</label>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => {
                if (!notes.trim()) return
                const auditor = members.find((m) => m.user_id === auditorId)
                const auditorName = auditor ? `${auditor.user.first_name} ${auditor.user.last_name}` : 'Auditeur'
                const contactObj = contactId ? contacts.find((c) => c.id === contactId) : undefined
                const cr = generateCompteRendu(interview, contactObj, auditorName, notes)
                setNotes(cr)
              }} disabled={!notes.trim()}
                className="text-[10px] font-semibold text-white bg-purple-500 px-2.5 py-1 rounded-lg hover:bg-purple-600 disabled:opacity-30 transition-colors">
                {'\u2733'} G&eacute;n&eacute;rer le CR
              </button>
              <button type="button" onClick={() => {
                const detected = detectControls(interview, notes, domains)
                if (detected.length > 0) {
                  setSelectedControlIds(new Set([...Array.from(selectedControlIds), ...detected]))
                  if (!showControls) setShowControls(true)
                }
              }} disabled={!notes.trim()}
                className="text-[10px] font-semibold text-forest-700 bg-forest-50 border border-forest-300 px-2.5 py-1 rounded-lg hover:bg-forest-100 disabled:opacity-30 transition-colors">
                {'\uD83D\uDD0D'} D&eacute;tecter les contr&ocirc;les
              </button>
            </div>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6}
            placeholder="Saisissez vos notes brutes puis cliquez sur 'G&eacute;n&eacute;rer le CR' pour les structurer automatiquement..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500 resize-y leading-relaxed font-mono" />
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px] text-gray-300">Astuce : saisissez vos notes brutes, puis cliquez {'\u2733'} pour structurer.</p>
            <button type="button" onClick={() => {
              const auditor = members.find((m) => m.user_id === auditorId)
              const auditorN = auditor ? `${auditor.user.first_name} ${auditor.user.last_name}` : 'Auditeur'
              const contactObj = contactId ? contacts.find((c) => c.id === contactId) : undefined
              const codes = Array.from(selectedControlIds).map((id) => findControl(domains, id)?.code).filter(Boolean) as string[]
              generateInterviewCRPDF({ interview, contact: contactObj, auditorName: auditorN, missionName, rawNotes: notes, controlCodes: codes })
            }} disabled={!notes.trim()}
              className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-100 disabled:opacity-30 transition-colors">
              {'\uD83D\uDCC4'} T&eacute;l&eacute;charger PDF
            </button>
          </div>
        </div>

        {/* Linked controls */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">Contr&ocirc;les couverts <span className="text-gray-300">({selectedControlIds.size})</span></label>
            <button onClick={() => setShowControls(!showControls)} className="text-[10px] text-forest-700 hover:underline">
              {showControls ? 'Masquer' : 'S\u00e9lectionner des contr\u00f4les'}
            </button>
          </div>

          {/* Selected controls chips */}
          {selectedControlIds.size > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {Array.from(selectedControlIds).map((id) => {
                const ctrl = findControl(domains, id)
                return (
                  <span key={id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-forest-50 text-forest-700 border border-forest-200">
                    <span className="font-mono font-medium">{ctrl?.code ?? id.slice(0, 8)}</span>
                    <button onClick={() => toggleControl(id)} className="text-forest-400 hover:text-red-500">{'\u00d7'}</button>
                  </span>
                )
              })}
            </div>
          )}

          {/* Control picker */}
          {showControls && (
            <div className="border border-gray-200 rounded-lg max-h-[200px] overflow-y-auto">
              {domains.map((domain) => (
                <div key={domain.id}>
                  <div className="bg-gray-50 px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide sticky top-0">
                    {domain.code} {domain.name}
                  </div>
                  {domain.controls.map((ctrl) => (
                    <label key={ctrl.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-forest-50 cursor-pointer text-xs">
                      <input type="checkbox" checked={selectedControlIds.has(ctrl.id)} onChange={() => toggleControl(ctrl.id)} className="rounded border-gray-300 accent-forest-700" />
                      <span className="font-mono text-[10px] text-forest-700">{ctrl.code}</span>
                      <span className="text-gray-700 truncate">{ctrl.name}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50">Annuler</button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
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

function findControl(domains: DomainWithControls[], controlId: string): { code: string; name: string } | null {
  for (const d of domains) {
    const ctrl = d.controls.find((c) => c.id === controlId)
    if (ctrl) return ctrl
  }
  return null
}
