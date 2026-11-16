import { useCallback } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Modal } from '../../../components/ui/Modal'
import { ValidationDetailBody } from './ValidationDetailBody'
import { ReviewDecisionControls } from './ReviewDecisionControls'
import { useReviewDecision, type ReviewDecision } from './useReviewDecision'
import { ASSESSMENT_STATUS_CONFIG } from '../mission-constants'
import type { ReviewAssessment } from '../useReviewAssessments'

interface ValidationDetailPanelProps {
  assessment: ReviewAssessment
  reviewStage: 'lead_review' | 'associate_review'
  onClose: () => void
  onReviewed: () => void
}

export function ValidationDetailPanel({ assessment, reviewStage, onClose, onReviewed }: ValidationDetailPanelProps){
  const { comment, setComment, reviewing, error, decide } = useReviewDecision()
  const status = ASSESSMENT_STATUS_CONFIG[assessment.status]

  const canReview =
    (reviewStage === 'lead_review' && assessment.status === 'submitted') ||
    (reviewStage === 'associate_review' && assessment.status === 'in_review')

  const onDecide = useCallback(async (decision: ReviewDecision) => {
    const ok = await decide(assessment.id, decision)
    if (ok) { onReviewed(); onClose() }
  }, [assessment.id, decide, onReviewed, onClose])

  return (
    <Modal open onClose={onClose} title={`${assessment.control.code} - ${assessment.control.name}`}>
      <div className="space-y-4">
        <ValidationDetailBody assessment={assessment} />

        {canReview ? (
          <ReviewDecisionControls
            comment={comment}
            setComment={setComment}
            reviewing={reviewing}
            error={error}
            onDecide={(d) => void onDecide(d)}
          />
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-400 pt-2">
            <Badge label={status.label} variant={status.variant} />
            <span>{assessment.status === 'approved' ? 'Ce contrôle est validé.' : 'En attente de revue.'}</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
