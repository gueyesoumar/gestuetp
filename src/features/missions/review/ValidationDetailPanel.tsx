import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { ASSESSMENT_STATUS_CONFIG } from '../mission-constants'
import type { ReviewAssessment } from '../useReviewAssessments'
import type { ValidationStage } from '../../../types/database.types'

interface ValidationDetailPanelProps {
  assessment: ReviewAssessment
  reviewStage: 'lead_review' | 'associate_review'
  onClose: () => void
  onReviewed: () => void
}

const STAGE_LABELS: Record<ValidationStage, string> = {
  auditor_submitted: 'Soumis',
  lead_review: 'Revue Lead',
  associate_review: 'Revue Associ\u00e9',
  client_review: 'Client',
}

export function ValidationDetailPanel({ assessment, reviewStage, onClose, onReviewed }: ValidationDetailPanelProps){
  const [comment, setComment] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const status = ASSESSMENT_STATUS_CONFIG[assessment.status]

  const canReview =
    (reviewStage === 'lead_review' && assessment.status === 'submitted') ||
    (reviewStage === 'associate_review' && assessment.status === 'in_review')

  const handleDecision = useCallback(async (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !comment.trim()) {
      setError('Un commentaire est obligatoire pour un rejet.')
      return
    }
    setReviewing(true)
    setError(null)
    const { data, error: fnError } = await supabase.functions.invoke('review-assessment', {
      body: { assessment_id: assessment.id, decision, comment: comment || null },
    })
    if (fnError || data?.error) {
      setError(fnError?.message ?? data?.error ?? 'Erreur lors de la validation.')
      setReviewing(false)
      return
    }
    setReviewing(false)
    onReviewed()
    onClose()
  }, [assessment.id, comment, onReviewed, onClose])

  return (
    <Modal open onClose={onClose} title={`${assessment.control.code} \u2014 ${assessment.control.name}`}>
      <div className="space-y-4">
        {/* Validation timeline */}
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

        {/* Findings */}
        <Section label="Constats" text={assessment.findings} />
        {assessment.recommendations && <Section label="Recommandations" text={assessment.recommendations} />}

        {/* Review actions */}
        {canReview && (
          <div className="border-t border-gray-200 pt-4 space-y-3">
            {error && <ErrorAlert message={error} />}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Commentaire (obligatoire pour un rejet)..."
              rows={2}
              disabled={reviewing}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            />
            <div className="flex gap-3">
              <button onClick={() => handleDecision('approved')} disabled={reviewing}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-[13px] font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                &#10003; Approuver
              </button>
              <button onClick={() => handleDecision('rejected')} disabled={reviewing}
                className="flex-1 bg-white text-red-600 border border-red-600 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
                &#10007; Rejeter
              </button>
            </div>
          </div>
        )}

        {!canReview && (
          <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
            <Badge label={status.label} variant={status.variant} />
            <span>{assessment.status === 'approved' ? 'Ce contr\u00f4le est valid\u00e9.' : 'En attente de revue.'}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}

function Section({ label, text }: { label: string; text: string | null }){
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <div className="bg-[#FAFAF8] border border-gray-100 rounded-lg p-3 text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
        {text || '\u2014'}
      </div>
    </div>
  )
}

function TimelineDot({ done, current, rejected }: { done: boolean; current: boolean; rejected: boolean }){
  const base = 'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0'
  if (rejected) return <div className={`${base} bg-red-600 text-white`}>&#10007;</div>
  if (done) return <div className={`${base} bg-green-600 text-white`}>&#10003;</div>
  if (current) return <div className={`${base} bg-forest-700 text-white shadow-[0_0_0_3px_theme(colors.forest.100)]`}>&#9998;</div>
  return <div className={`${base} bg-white text-gray-300 border-2 border-gray-200`}>&middot;</div>
}
