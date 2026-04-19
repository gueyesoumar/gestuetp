import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { MissionMemberRow } from '../useMissionDetail'
import type { ClientContact } from '../../../types/database.types'

interface InterviewFormModalProps {
  missionId: string
  members: MissionMemberRow[]
  contacts: ClientContact[]
  onCreateInterview: (data: {
    mission_id: string; title: string; auditor_id: string; contact_id: string | null
    scheduled_date: string; scheduled_time: string; duration_minutes: number
    location: string; notes: string
  }) => Promise<boolean>
  onCreateContact: (data: { mission_id: string; name: string; job_title: string; department: string }) => Promise<string | null>
  onClose: () => void
  saving: boolean
  error: string | null
}

export function InterviewFormModal({ missionId, members, contacts, onCreateInterview, onCreateContact, onClose, saving, error }: InterviewFormModalProps) {
  const [title, setTitle] = useState('')
  const [auditorId, setAuditorId] = useState('')
  const [contactId, setContactId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState(60)
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  // New contact form
  const [showNewContact, setShowNewContact] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [newContactTitle, setNewContactTitle] = useState('')
  const [newContactDept, setNewContactDept] = useState('')

  const auditors = members.filter((m) => m.role === 'auditor' || m.role === 'lead_auditor')
  const canSubmit = title.trim() && auditorId && date

  const handleSubmit = async () => {
    if (!canSubmit) return

    let finalContactId = contactId || null

    // Create new contact if needed
    if (showNewContact && newContactName.trim()) {
      const id = await onCreateContact({
        mission_id: missionId,
        name: newContactName,
        job_title: newContactTitle,
        department: newContactDept,
      })
      if (id) finalContactId = id
    }

    const ok = await onCreateInterview({
      mission_id: missionId,
      title,
      auditor_id: auditorId,
      contact_id: finalContactId,
      scheduled_date: date,
      scheduled_time: time,
      duration_minutes: duration,
      location,
      notes,
    })
    if (ok) onClose()
  }

  return (
    <Modal open onClose={onClose} title="Planifier un entretien">
      <div className="space-y-4">
        {error && <ErrorAlert message={error} />}

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Titre de l&apos;entretien <span className="text-red-500">*</span></label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Revue politique SSI avec le RSSI"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
        </div>

        {/* Date + Time + Duration */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Heure</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Dur&eacute;e</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500">
              <option value={30}>30 min</option>
              <option value={60}>1h</option>
              <option value={90}>1h30</option>
              <option value={120}>2h</option>
              <option value={180}>3h</option>
            </select>
          </div>
        </div>

        {/* Auditor */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Auditeur <span className="text-red-500">*</span></label>
          <select value={auditorId} onChange={(e) => setAuditorId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500">
            <option value="">S&eacute;lectionner...</option>
            {auditors.map((a) => (
              <option key={a.user_id} value={a.user_id}>{a.user.first_name} {a.user.last_name}</option>
            ))}
          </select>
        </div>

        {/* Contact client */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Interlocuteur client</label>
          {!showNewContact ? (
            <div className="flex gap-2">
              <select value={contactId} onChange={(e) => setContactId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500">
                <option value="">Aucun / Non d&eacute;fini</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.job_title ? ` (${c.job_title})` : ''}</option>
                ))}
              </select>
              <button onClick={() => setShowNewContact(true)}
                className="text-xs text-forest-700 bg-forest-50 border border-forest-300 px-3 py-2 rounded-lg hover:bg-forest-100 shrink-0">
                + Nouveau
              </button>
            </div>
          ) : (
            <div className="bg-forest-50 border border-forest-200 rounded-lg p-3 space-y-2">
              <input type="text" value={newContactName} onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Nom complet" className="w-full px-3 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={newContactTitle} onChange={(e) => setNewContactTitle(e.target.value)}
                  placeholder="Fonction (ex: RSSI)" className="px-3 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500" />
                <input type="text" value={newContactDept} onChange={(e) => setNewContactDept(e.target.value)}
                  placeholder="D&eacute;partement" className="px-3 py-1.5 border border-gray-200 rounded text-[12px] outline-none focus:border-forest-500" />
              </div>
              <button onClick={() => setShowNewContact(false)} className="text-[10px] text-gray-400 hover:text-gray-600">Annuler</button>
            </div>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Lieu</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
            placeholder="Salle, visio, bureau..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500" />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optionnel)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Sujets &agrave; aborder, pr&eacute;paration..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500 resize-y" />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] text-gray-500 hover:bg-gray-50">Annuler</button>
          <button onClick={handleSubmit} disabled={!canSubmit || saving}
            className="px-5 py-2 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors">
            {saving ? 'Cr\u00e9ation...' : 'Planifier l\u2019entretien'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
