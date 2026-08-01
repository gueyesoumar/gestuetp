import { useState } from 'react'
import { ChevronDown, ChevronRight, Check, X, Clock } from 'lucide-react'
import type { AssessmentDetail, ValidationEvent } from './useInternalReviewData'

interface ValidationTimelineProps {
  assessments: AssessmentDetail[]
}

const STAGE_LABEL: Record<ValidationEvent['stage'], string> = {
  auditor_submitted: 'Soumission auditeur',
  lead_review: 'Revue chef de mission',
  associate_review: 'Revue associé',
  client_review: 'Revue client',
}

function fmt(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function ValidationTimeline({ assessments }: ValidationTimelineProps) {
  const withHistory = assessments.filter((a) => a.validations.length > 0)
  if (withHistory.length === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100">
        <h3 className="text-[14px] font-bold text-gray-900">Historique des validations</h3>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Chronologie des décisions par contrôle ({withHistory.length} contrôle{withHistory.length > 1 ? 's' : ''})
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {withHistory.map((a) => (
          <ControlValidationRow key={a.assessmentId} assessment={a} />
        ))}
      </div>
    </div>
  )
}

function ControlValidationRow({ assessment }: { assessment: AssessmentDetail }) {
  const [open, setOpen] = useState(false)
  const events = assessment.validations
  const lastEvent = events[events.length - 1]
  const rejections = events.filter((e) => e.decision === 'rejected').length

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-2.5 flex items-center gap-2.5 hover:bg-forest-50/40 transition-colors text-left"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={13} className="text-gray-400 shrink-0" /> : <ChevronRight size={13} className="text-gray-400 shrink-0" />}
        <span className="font-mono text-[11px] font-bold text-forest-700 shrink-0">{assessment.controlCode}</span>
        <span className="text-[12px] text-gray-700 truncate flex-1">{assessment.controlName}</span>
        <span className="text-[10px] text-gray-400 shrink-0">{events.length} étape{events.length > 1 ? 's' : ''}</span>
        {rejections > 0 && (
          <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">
            {rejections} rejet{rejections > 1 ? 's' : ''}
          </span>
        )}
        {lastEvent && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
            lastEvent.decision === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {lastEvent.decision === 'approved' ? '✓ Approuvé' : '✗ Rejeté'}
          </span>
        )}
      </button>
      {open && (
        <ol className="px-5 pb-3 pt-1 space-y-2 ml-5 border-l-2 border-gray-100">
          {events.map((ev, i) => (
            <TimelineEntry key={i} event={ev} />
          ))}
        </ol>
      )}
    </div>
  )
}

function TimelineEntry({ event }: { event: ValidationEvent }) {
  const isApproved = event.decision === 'approved'
  const isSubmit = event.stage === 'auditor_submitted'
  const Icon = isSubmit ? Clock : isApproved ? Check : X
  const cls = isSubmit
    ? 'bg-blue-100 text-blue-700'
    : isApproved
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700'

  return (
    <li className="relative pl-3 -ml-px">
      <span className={`absolute -left-[11px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center ${cls} border-2 border-white`}>
        <Icon size={10} />
      </span>
      <div className="text-[11px] text-gray-500 leading-snug">
        <span className="font-semibold text-gray-700">{STAGE_LABEL[event.stage]}</span>
        <span className="ml-1.5 text-[10px] text-gray-400">{fmt(event.createdAt)}</span>
      </div>
      <div className="text-[11px] text-gray-700 mt-0.5">
        <span className={isApproved ? 'text-green-700 font-medium' : isSubmit ? 'text-blue-700 font-medium' : 'text-red-700 font-medium'}>
          {isSubmit ? 'soumis par' : isApproved ? 'approuvé par' : 'rejeté par'}
        </span>{' '}
        <span className="font-medium">{event.authorName}</span>
      </div>
      {event.comment && (
        <p className="mt-1 text-[11px] text-gray-600 italic bg-gray-50 border-l-2 border-gray-200 pl-2 py-1 rounded-r">
          « {event.comment} »
        </p>
      )}
    </li>
  )
}
