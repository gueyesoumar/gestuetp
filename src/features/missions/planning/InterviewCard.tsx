import { useState } from 'react'
import type { InterviewSchedule, ClientContact, InterviewStatus } from '../../../types/database.types'

interface InterviewCardProps {
  interview: InterviewSchedule
  contact: ClientContact | undefined
  onEdit: (interview: InterviewSchedule) => void
  onStatusChange: (id: string, status: InterviewStatus) => void
  onDelete: (id: string) => void
  saving: boolean
}

const STATUS_CONFIG: Record<InterviewStatus, { label: string; cls: string }> = {
  scheduled: { label: 'Planifi\u00e9', cls: 'bg-blue-50 text-blue-600' },
  completed: { label: 'Termin\u00e9', cls: 'bg-green-50 text-green-600' },
  cancelled: { label: 'Annul\u00e9', cls: 'bg-red-50 text-red-500' },
  rescheduled: { label: 'Report\u00e9', cls: 'bg-amber-50 text-amber-600' },
}

export function InterviewCard({ interview, contact, onEdit, onStatusChange, onDelete }: InterviewCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const d = new Date(interview.scheduled_date)
  const day = d.getDate()
  const month = d.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()
  const time = interview.scheduled_time.slice(0, 5)
  const endMinutes = timeToMinutes(interview.scheduled_time) + interview.duration_minutes
  const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`
  const statusCfg = STATUS_CONFIG[interview.status]
  const isCancelled = interview.status === 'cancelled'

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-gray-100 last:border-b-0 ${isCancelled ? 'opacity-50' : ''}`}>
      {/* Date badge */}
      <div className={`w-11 text-center rounded-md py-1 px-1.5 shrink-0 ${interview.status === 'completed' ? 'bg-green-50' : isCancelled ? 'bg-gray-100' : 'bg-forest-50'}`}>
        <p className={`text-base font-bold leading-none ${interview.status === 'completed' ? 'text-green-600' : isCancelled ? 'text-gray-400' : 'text-forest-700'}`}>{day}</p>
        <p className={`text-[9px] font-medium ${interview.status === 'completed' ? 'text-green-500' : isCancelled ? 'text-gray-300' : 'text-forest-500'}`}>{month}</p>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-xs font-semibold ${isCancelled ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{interview.title}</p>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${statusCfg.cls}`}>{statusCfg.label}</span>
        </div>
        <p className="text-[10px] text-gray-300 mt-0.5">
          {time} {'\u2014'} {endTime} ({interview.duration_minutes}min)
          {interview.location && <>{' \u00b7 '}{interview.location}</>}
          {contact && <>{' \u00b7 '}<strong>{contact.name}</strong>{contact.job_title ? ` (${contact.job_title})` : ''}</>}
        </p>

        {/* Control tags */}
        {interview.control_ids.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {interview.control_ids.slice(0, 4).map((id) => (
              <span key={id} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">{id.slice(0, 8)}</span>
            ))}
            {interview.control_ids.length > 4 && <span className="text-[9px] text-gray-300">+{interview.control_ids.length - 4}</span>}
          </div>
        )}

        {/* Notes/compte-rendu (collapsed) */}
        {interview.notes && (
          <NotePreview notes={interview.notes} />
        )}
      </div>

      {/* Actions menu */}
      <div className="relative shrink-0">
        <button onClick={() => setShowMenu(!showMenu)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors text-sm">
          {'\u22EE'}
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-8 z-20 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
              <MenuBtn label={'\u270E Modifier'} onClick={() => { setShowMenu(false); onEdit(interview) }} />
              {interview.status === 'scheduled' && (
                <>
                  <MenuBtn label={'\u2705 Marquer termin\u00e9'} onClick={() => { setShowMenu(false); onStatusChange(interview.id, 'completed') }} />
                  <MenuBtn label={'\uD83D\uDD04 Reprogrammer'} onClick={() => { setShowMenu(false); onStatusChange(interview.id, 'rescheduled') }} />
                  <MenuBtn label={'\u274C Annuler'} onClick={() => { setShowMenu(false); onStatusChange(interview.id, 'cancelled') }} danger />
                </>
              )}
              {interview.status === 'completed' && (
                <MenuBtn label={'\uD83D\uDCDD Modifier le compte-rendu'} onClick={() => { setShowMenu(false); onEdit(interview) }} />
              )}
              {interview.status === 'rescheduled' && (
                <MenuBtn label={'\uD83D\uDCC5 Replanifier'} onClick={() => { setShowMenu(false); onEdit(interview) }} />
              )}
              <div className="border-t border-gray-100 my-1" />
              <MenuBtn label={'\uD83D\uDDD1 Supprimer'} onClick={() => { setShowMenu(false); onDelete(interview.id) }} danger />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MenuBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-3 py-2 text-xs transition-colors ${danger ? 'text-red-500 hover:bg-red-50' : 'text-gray-700 hover:bg-forest-50'}`}>
      {label}
    </button>
  )
}

function NotePreview({ notes }: { notes: string }): JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const isLong = notes.length > 150

  return (
    <div className="mt-2 p-2 bg-gray-50 rounded-lg text-[10px] text-gray-500 leading-relaxed">
      {expanded || !isLong ? notes : `${notes.slice(0, 150)}...`}
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="ml-1 text-forest-700 font-medium hover:underline">
          {expanded ? 'R\u00e9duire' : 'Voir plus'}
        </button>
      )}
    </div>
  )
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
