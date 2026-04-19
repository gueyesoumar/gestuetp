import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import type { ReviewAssessment } from './useReviewAssessments'
import type { AssessmentStatus, ValidationStage } from '../../types/database.types'

interface ReviewAssessmentCardProps {
  assessment: ReviewAssessment
  reviewStage: 'lead_review' | 'associate_review'
  onReview: (assessmentId: string, decision: 'approved' | 'rejected', comment: string) => Promise<boolean>
  reviewing: boolean
}

const statusConfig: Record<AssessmentStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'red' }> = {
  draft: { label: 'Brouillon', variant: 'gray' },
  submitted: { label: 'Soumis', variant: 'blue' },
  in_review: { label: 'En revue', variant: 'blue' },
  approved: { label: 'Approuv\u00e9', variant: 'green' },
  rejected: { label: 'Rejet\u00e9', variant: 'red' },
}

const stageLabels: Record<ValidationStage, string> = {
  auditor_submitted: 'Soumis par l\u2019auditeur',
  lead_review: 'Revue chef de mission',
  associate_review: 'Revue associ\u00e9',
  client_review: 'Revue client',
}

export function ReviewAssessmentCard({ assessment, reviewStage, onReview, reviewing }: ReviewAssessmentCardProps) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const status = statusConfig[assessment.status]

  const canReview =
    (reviewStage === 'lead_review' && assessment.status === 'submitted') ||
    (reviewStage === 'associate_review' && assessment.status === 'in_review')

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    setError(null)
    if (decision === 'rejected' && !comment.trim()) {
      setError('Un commentaire est obligatoire pour un rejet.')
      return
    }
    const ok = await onReview(assessment.id, decision, comment)
    if (ok) setComment('')
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-forest-700">
              {assessment.control.domain.code} &mdash; {assessment.control.code}
            </span>
            <Badge label={status.label} variant={status.variant} />
          </div>
          <h4 className="mt-1 text-sm font-medium text-gray-900">{assessment.control.name}</h4>
          <p className="text-xs text-gray-500">
            Auditeur : {assessment.auditor.first_name} {assessment.auditor.last_name}
          </p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">Constats</p>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{assessment.findings || '\u2014'}</p>
        </div>

        {assessment.recommendations && (
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Recommandations</p>
            <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{assessment.recommendations}</p>
          </div>
        )}

        {assessment.validations.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase text-gray-500 mb-2">Historique de validation</p>
            <div className="space-y-1">
              {assessment.validations.map((v) => (
                <div key={v.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <Badge
                    label={v.decision === 'approved' ? 'Approuv\u00e9' : 'Rejet\u00e9'}
                    variant={v.decision === 'approved' ? 'green' : 'red'}
                  />
                  <span>{stageLabels[v.stage]}</span>
                  {v.comment && <span className="text-gray-400">&mdash; {v.comment}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {canReview && (
          <div className="border-t border-gray-100 pt-3 space-y-3">
            {error && <ErrorAlert message={error} />}
            <div>
              <label className="block text-sm font-medium text-gray-700">Commentaire</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                disabled={reviewing}
                placeholder="Obligatoire en cas de rejet..."
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleDecision('approved')}
                disabled={reviewing}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Approuver
              </button>
              <button
                onClick={() => handleDecision('rejected')}
                disabled={reviewing}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Rejeter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
