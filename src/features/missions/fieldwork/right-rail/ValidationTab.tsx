import { Check, Clock, X, Calendar, UserCheck, Users } from 'lucide-react'
import { useValidationTimeline, type ValidatorInfo } from './useValidationTimeline'
import type { AssessmentWithControl } from '../../useAuditorAssessments'
import type { AssessmentValidation, ValidationStage } from '../../../../types/database.types'

interface ValidationTabProps {
  assessment: AssessmentWithControl | null
  missionEndDate?: string | null
}

const STAGE_LABELS: Record<ValidationStage, string> = {
  auditor_submitted: 'Soumission auditeur',
  lead_review: 'Chef de mission',
  associate_review: 'Associé',
  client_review: 'Client',
}

const STAGE_ORDER: ValidationStage[] = ['auditor_submitted', 'lead_review', 'associate_review', 'client_review']

function fullName(v: ValidatorInfo | undefined): string {
  if (!v) return '—'
  const parts = [v.first_name, v.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : v.email
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

function currentStageFor(status: string, stage: ValidationStage): boolean {
  if (stage === 'auditor_submitted') return status === 'submitted'
  if (stage === 'lead_review') return status === 'submitted'
  if (stage === 'associate_review') return status === 'in_review'
  if (stage === 'client_review') return status === 'approved'
  return false
}

function stageIconFor(stage: ValidationStage) {
  if (stage === 'lead_review') return <UserCheck size={11} />
  if (stage === 'associate_review' || stage === 'client_review') return <Users size={11} />
  return null
}

function daysUntil(iso: string): number {
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })
}

export function ValidationTab({ assessment, missionEndDate }: ValidationTabProps) {
  const { validations, validatorMap, loading, error } = useValidationTimeline(assessment?.id ?? null)

  if (!assessment) {
    return <p className="text-[11px] text-gray-400 italic text-center py-6 px-3">S&eacute;lectionnez un contr&ocirc;le.</p>
  }
  if (loading) {
    return <p className="text-[11px] text-gray-400 italic text-center py-6 px-3">Chargement...</p>
  }
  if (error) {
    return <p className="text-[11px] text-red-600 text-center py-6 px-3">{error}</p>
  }

  const validationByStage = new Map<ValidationStage, AssessmentValidation>()
  for (const v of validations) {
    if (v.decision === 'approved' || v.decision === 'rejected') {
      validationByStage.set(v.stage, v)
    }
  }

  return (
    <div className="p-3 space-y-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Cascade de validation</div>

      <ol className="space-y-2.5">
        {STAGE_ORDER.map((stage) => (
          <TimelineItem
            key={stage}
            stage={stage}
            validation={validationByStage.get(stage)}
            isCurrent={!validationByStage.get(stage) && currentStageFor(assessment.status, stage)}
            validator={validationByStage.get(stage) ? validatorMap.get(validationByStage.get(stage)!.validated_by) : undefined}
          />
        ))}
      </ol>

      {assessment.status === 'rejected' && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-2.5">
          <p className="text-[10px] uppercase tracking-wider font-bold text-red-700 inline-flex items-center gap-1">
            <X size={11} /> Rejet&eacute;
          </p>
          <p className="text-[11px] text-red-700 mt-0.5">Le constat doit &ecirc;tre corrig&eacute; et resoumis.</p>
        </div>
      )}

      {assessment.status === 'draft' && (
        <div className="mt-3 rounded-lg bg-gold-50 border border-gold-200 p-2.5">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gold-700 inline-flex items-center gap-1">
            <Calendar size={11} /> Brouillon
          </p>
          <p className="text-[11px] text-gold-700 mt-0.5">Compl&eacute;tez et soumettez pour d&eacute;clencher la cascade.</p>
        </div>
      )}

      <DeadlineCallout status={assessment.status} missionEndDate={missionEndDate ?? null} />
    </div>
  )
}

function DeadlineCallout({ status, missionEndDate }: { status: string; missionEndDate: string | null }) {
  if (!missionEndDate) return null
  // Only show callout while authoring or under review (not approved/rejected/internal_review)
  if (status === 'approved' || status === 'rejected') return null

  const days = daysUntil(missionEndDate)
  // Show only when the deadline is approaching (≤7 days) or passed
  if (days > 7) return null

  if (days < 0) {
    return (
      <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-2.5">
        <p className="text-[10px] uppercase tracking-wider font-bold text-red-700 inline-flex items-center gap-1">
          <Calendar size={11} /> Échéance dépassée
        </p>
        <p className="text-[11px] text-red-700 mt-0.5">
          Mission attendue le {formatDeadline(missionEndDate)} (J+{Math.abs(days)}).
        </p>
      </div>
    )
  }

  const dayLabel = days === 0 ? 'aujourd’hui' : `J-${days}`
  return (
    <div className="mt-3 rounded-lg bg-gold-50 border border-gold-300 p-2.5">
      <p className="text-[10px] uppercase tracking-wider font-bold text-gold-700 inline-flex items-center gap-1">
        <Calendar size={11} /> Échéance proche
      </p>
      <p className="text-[11px] text-gold-700 mt-0.5">
        À soumettre avant le {formatDeadline(missionEndDate)} ({dayLabel}).
      </p>
    </div>
  )
}

interface TimelineItemProps {
  stage: ValidationStage
  validation: AssessmentValidation | undefined
  isCurrent: boolean
  validator: ValidatorInfo | undefined
}

function TimelineItem({ stage, validation, isCurrent, validator }: TimelineItemProps) {
  const isDone = validation?.decision === 'approved'
  const isRejected = validation?.decision === 'rejected'

  let dotClass = 'bg-white text-gray-300 border-2 border-gray-200'
  let dotIcon: React.ReactNode = null
  if (isDone) {
    dotClass = 'bg-green-600 text-white border-green-600'
    dotIcon = <Check size={11} />
  } else if (isRejected) {
    dotClass = 'bg-red-600 text-white border-red-600'
    dotIcon = <X size={11} />
  } else if (isCurrent) {
    dotClass = 'bg-gold-500 text-white border-gold-500 animate-pulse'
    dotIcon = <Clock size={11} />
  }

  return (
    <li className="flex items-start gap-2.5">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${dotClass}`}>{dotIcon}</div>
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700">
          {stageIconFor(stage)} <span>{STAGE_LABELS[stage]}</span>
        </div>
        {validation ? (
          <>
            <p className="text-[10px] text-gray-500">
              {fullName(validator)} &middot; {formatDateTime(validation.created_at)}
            </p>
            {validation.comment && (
              <p className="mt-1 text-[11px] text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1.5 whitespace-pre-wrap">
                {validation.comment}
              </p>
            )}
          </>
        ) : isCurrent ? (
          <p className="text-[10px] text-gold-700 italic">En attente</p>
        ) : (
          <p className="text-[10px] text-gray-300 italic">À venir</p>
        )}
      </div>
    </li>
  )
}
