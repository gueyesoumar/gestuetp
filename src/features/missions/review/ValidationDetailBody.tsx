import { Check, X, Pencil, AlertTriangle } from 'lucide-react'
import { FindingsList } from '../fieldwork/findings/FindingsList'
import { getConformityLabel, deriveSuggestedConformity } from '../fieldwork/findings/conformityRules'
import type { ConformityLevel } from '../mission-constants'
import type { ReviewAssessment } from '../useReviewAssessments'
import type { ValidationStage } from '../../../types/database.types'

const STAGE_LABELS: Record<ValidationStage, string> = {
  auditor_submitted: 'Soumis',
  lead_review: 'Revue chef de mission',
  associate_review: 'Revue associé',
  client_review: 'Client',
}

/** Contenu lecture seule d'une évaluation en revue : frise de validation, écart de
 *  conformité justifié, constats. Partagé par la modale et le mode focus. */
export function ValidationDetailBody({ assessment }: { assessment: ReviewAssessment }): JSX.Element {
  return (
    <div className="space-y-4">
      {/* Frise de validation */}
      <div className="flex items-center gap-0 py-3 bg-[#FAFAF8] -mx-5 px-5 rounded-lg">
        {(['auditor_submitted', 'lead_review', 'associate_review', 'client_review'] as ValidationStage[]).map((stage, i) => {
          const val = assessment.validations.find((v) => v.stage === stage)
          const isDone = !!val && val.decision === 'approved'
          const isRejected = !!val && val.decision === 'rejected'
          const isCurrent = !val && (
            (stage === 'lead_review' && assessment.status === 'submitted') ||
            (stage === 'associate_review' && assessment.status === 'in_review') ||
            (stage === 'auditor_submitted' && assessment.status === 'submitted')
          )
          return (
            <div key={stage} className="flex items-center">
              {i > 0 && <div className={`w-8 h-0.5 mx-1 ${isDone || (stage === 'auditor_submitted') ? 'bg-green-600' : 'bg-gray-200'}`} />}
              <div className="flex items-center gap-1.5">
                <TimelineDot done={isDone || stage === 'auditor_submitted'} current={isCurrent} rejected={isRejected} />
                <span className={`text-[11px] ${isDone || stage === 'auditor_submitted' ? 'text-green-600' : isCurrent ? 'text-forest-700 font-semibold' : 'text-gray-300'}`}>
                  {STAGE_LABELS[stage]}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Écart de conformité justifié par l'auditeur */}
      {assessment.conformity_override_reason && (() => {
        const chosen = assessment.conformity_level as ConformityLevel | null
        const suggested = deriveSuggestedConformity(assessment.findings)
        return (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[12px] font-semibold text-amber-900">
                Écart conformité justifié par l&apos;auditeur
              </p>
            </div>
            <div className="text-[11px] text-amber-800 mb-2 grid grid-cols-2 gap-2">
              <div>
                <span className="font-semibold">Conformité choisie :</span>{' '}
                {chosen ? getConformityLabel(chosen) : '-'}
              </div>
              <div>
                <span className="font-semibold">Suggérée :</span>{' '}
                {suggested ? getConformityLabel(suggested) : '-'}
              </div>
            </div>
            <div className="text-[12px] text-gray-700 bg-white rounded px-2 py-1.5 border border-amber-100 whitespace-pre-wrap leading-relaxed">
              {assessment.conformity_override_reason}
            </div>
          </div>
        )
      })()}

      {/* Constats */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Constats</p>
        <FindingsList
          findings={assessment.findings}
          emptyMessage="Aucun constat enregistré sur cette évaluation."
          density="compact"
        />
      </div>
    </div>
  )
}

function TimelineDot({ done, current, rejected }: { done: boolean; current: boolean; rejected: boolean }){
  const base = 'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0'
  if (rejected) return <div className={`${base} bg-red-600 text-white`}><X size={11} /></div>
  if (done) return <div className={`${base} bg-green-600 text-white`}><Check size={11} /></div>
  if (current) return <div className={`${base} bg-forest-700 text-white shadow-[0_0_0_3px_theme(colors.forest.100)]`}><Pencil size={10} /></div>
  return <div className={`${base} bg-white text-gray-300 border-2 border-gray-200`}>&middot;</div>
}
