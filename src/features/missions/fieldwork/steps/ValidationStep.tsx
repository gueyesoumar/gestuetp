import { useEffect, useState } from 'react'
import { Check, AlertTriangle, Play, Clock, UserCheck, Users } from 'lucide-react'
import { Badge } from '../../../../components/ui/Badge'
import { supabase } from '../../../../lib/supabase'
import { ASSESSMENT_STATUS_CONFIG } from '../../mission-constants'
import type { AssessmentWithControl } from '../../useAuditorAssessments'
import type { UseAssessmentFindingsReturn, FindingClassification } from '../findings/useAssessmentFindings'

interface ValidationStepProps {
  assessment: AssessmentWithControl
  observations: string
  findingsHook: UseAssessmentFindingsReturn
  onSubmit: () => void
  saving: boolean
}

type ValidationInfo = {
  leadApproved: boolean
  associateApproved: boolean
  clientApproved: boolean
  clientRejected: boolean
}

const FINDING_LABELS: Record<FindingClassification, { label: string; color: string }> = {
  major_nc: { label: 'NC majeure', color: 'text-red-700' },
  minor_nc: { label: 'NC mineure', color: 'text-orange-700' },
  observation: { label: 'Observation', color: 'text-blue-700' },
  strength: { label: 'Point fort', color: 'text-green-700' },
}

function useValidationInfo(assessmentId: string): ValidationInfo {
  const [info, setInfo] = useState<ValidationInfo>({
    leadApproved: false, associateApproved: false,
    clientApproved: false, clientRejected: false,
  })

  useEffect(() => {
    const abortController = new AbortController()
    supabase
      .from('assessment_validations')
      .select('stage, decision')
      .eq('assessment_id', assessmentId)
      .abortSignal(abortController.signal)
      .then(({ data }) => {
        if (abortController.signal.aborted || !data) return
        setInfo({
          leadApproved: data.some((v) => v.stage === 'lead_review' && v.decision === 'approved'),
          associateApproved: data.some((v) => v.stage === 'associate_review' && v.decision === 'approved'),
          clientApproved: data.some((v) => v.stage === 'client_review' && v.decision === 'approved'),
          clientRejected: data.some((v) => v.stage === 'client_review' && v.decision === 'rejected'),
        })
      })
    return () => abortController.abort()
  }, [assessmentId])

  return info
}

export function ValidationStep({ assessment, observations, findingsHook, onSubmit, saving }: ValidationStepProps) {
  const findings = findingsHook.findings
  const canSubmit = findings.length > 0
  const status = ASSESSMENT_STATUS_CONFIG[assessment.status]
  const alreadySubmitted = assessment.status !== 'draft' && assessment.status !== 'rejected'
  const val = useValidationInfo(assessment.id)

  const counts = findings.reduce<Record<FindingClassification, number>>((acc, f) => {
    acc[f.classification] = (acc[f.classification] ?? 0) + 1
    return acc
  }, { major_nc: 0, minor_nc: 0, observation: 0, strength: 0 })

  return (
    <div className="space-y-4">
      <h4 className="text-[13px] font-semibold text-gray-900 flex items-center gap-1.5">
        <Check size={14} /> Validation &amp; soumission
      </h4>
      <p className="text-xs text-gray-300 leading-relaxed -mt-2">
        {alreadySubmitted
          ? 'Suivi de la validation de ce contr&ocirc;le.'
          : 'V&eacute;rifiez le r&eacute;sum&eacute; de vos travaux avant de soumettre au chef de mission.'}
      </p>

      <div className="rounded-xl border border-gray-200 bg-[#FAFAF8] divide-y divide-gray-100">
        <SummaryRow label="Statut"><Badge label={status.label} variant={status.variant} /></SummaryRow>
        <SummaryRow label="Observations">
          <p className="text-[13px] text-gray-700 line-clamp-3">{observations || '—'}</p>
        </SummaryRow>
        <SummaryRow label={`Constats (${findings.length})`}>
          {findings.length === 0 ? (
            <p className="text-[13px] text-red-500">Aucun constat (obligatoire)</p>
          ) : (
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2 text-[11px]">
                {(['major_nc', 'minor_nc', 'observation', 'strength'] as FindingClassification[])
                  .filter((c) => counts[c] > 0)
                  .map((c) => (
                    <span key={c} className={`font-semibold ${FINDING_LABELS[c].color}`}>
                      {counts[c]} {FINDING_LABELS[c].label}{counts[c] > 1 ? 's' : ''}
                    </span>
                  ))}
              </div>
              <ul className="text-[12px] text-gray-700 space-y-0.5 list-disc list-inside">
                {findings.slice(0, 5).map((f) => (
                  <li key={f.id} className="line-clamp-1">
                    <span className={`font-semibold ${FINDING_LABELS[f.classification].color}`}>
                      {FINDING_LABELS[f.classification].label}
                    </span>{' '}— {f.description.slice(0, 80)}{f.description.length > 80 ? '…' : ''}
                  </li>
                ))}
                {findings.length > 5 && (
                  <li className="text-gray-400 italic">… et {findings.length - 5} autre{findings.length - 5 > 1 ? 's' : ''}</li>
                )}
              </ul>
            </div>
          )}
        </SummaryRow>
      </div>

      {alreadySubmitted ? (
        <div className="space-y-2">
          <ValidationPipelineStep
            icon={<UserCheck size={13} />}
            label="Chef de mission"
            done={val.leadApproved}
            active={!val.leadApproved && assessment.status === 'submitted'}
          />
          <ValidationPipelineStep
            icon={<Users size={13} />}
            label="Associ&eacute;"
            done={val.associateApproved}
            active={val.leadApproved && !val.associateApproved && assessment.status === 'in_review'}
          />
          <ValidationPipelineStep
            icon={<Users size={13} />}
            label="Client"
            done={val.clientApproved}
            active={val.associateApproved && !val.clientApproved && !val.clientRejected && assessment.status === 'approved'}
            rejected={val.clientRejected}
          />
        </div>
      ) : (
        <>
          {!canSubmit && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              <AlertTriangle size={13} className="inline mr-1" />Au moins un constat est requis pour soumettre ce contr&ocirc;le.
            </p>
          )}

          <button
            onClick={onSubmit}
            disabled={!canSubmit || saving}
            className="w-full bg-forest-700 text-white py-3 rounded-xl text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Play size={14} /> {saving ? 'Soumission...' : 'Soumettre au chef de mission'}
          </button>
        </>
      )}
    </div>
  )
}

function ValidationPipelineStep({ icon, label, done, active, rejected }: {
  icon: React.ReactNode
  label: string
  done: boolean
  active: boolean
  rejected?: boolean
}) {
  let bgClass = 'bg-gray-50 border-gray-200 text-gray-400'
  let statusLabel = 'En attente'
  let statusIcon = <Clock size={12} className="text-gray-300" />

  if (done) {
    bgClass = 'bg-forest-50 border-forest-200 text-forest-700'
    statusLabel = 'Validé'
    statusIcon = <Check size={12} className="text-forest-600" />
  } else if (rejected) {
    bgClass = 'bg-red-50 border-red-200 text-red-700'
    statusLabel = 'Rejeté'
    statusIcon = <AlertTriangle size={12} className="text-red-500" />
  } else if (active) {
    bgClass = 'bg-gold-50 border-gold-200 text-gold-700'
    statusLabel = 'En cours'
    statusIcon = <Clock size={12} className="text-gold-500" />
  }

  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${bgClass}`}>
      <div className="flex items-center gap-2 text-[12px] font-medium">
        {icon} {label}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium">
        {statusIcon} {statusLabel}
      </div>
    </div>
  )
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  )
}
