import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useReviewAssessments } from './useReviewAssessments'
import { ReviewAssessmentCard } from './ReviewAssessmentCard'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'
import { Badge } from '../../components/ui/Badge'
import type { MissionDetail } from './useMissionDetail'

interface MissionReviewTabProps {
  mission: MissionDetail
}

export function MissionReviewTab({ mission }: MissionReviewTabProps) {
  const { profile } = useAuth()
  const { assessments, loading, error, refetch } = useReviewAssessments(mission.id)
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const isLead = profile?.id === mission.lead_auditor_user?.id
  const isAssociate = profile?.id === mission.associate_user?.id
  const reviewStage = isAssociate ? 'associate_review' as const : 'lead_review' as const

  const handleReview = useCallback(async (
    assessmentId: string,
    decision: 'approved' | 'rejected',
    comment: string
  ): Promise<boolean> => {
    setReviewing(true)
    setReviewError(null)

    const { data, error: fnError } = await supabase.functions.invoke('review-assessment', {
      body: { assessment_id: assessmentId, decision, comment: comment || null },
    })

    if (fnError) {
      let detail = fnError.message
      try {
        const context = (fnError as unknown as { context: { json: () => Promise<{ error?: string }> } }).context
        if (context?.json) {
          const body = await context.json()
          if (body?.error) detail = body.error
        }
      } catch { /* */ }
      setReviewError(detail)
      setReviewing(false)
      return false
    }

    if (data?.error) {
      setReviewError(data.error)
      setReviewing(false)
      return false
    }

    setReviewing(false)
    refetch()
    return true
  }, [refetch])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  if (!isLead && !isAssociate) {
    return (
      <EmptyState
        title="Acc&egrave;s r&eacute;serv&eacute;"
        description="Seuls le chef de mission et l&apos;associ&eacute; peuvent valider les contr&ocirc;les."
      />
    )
  }

  if (assessments.length === 0) {
    return (
      <EmptyState
        title="Aucun contr&ocirc;le soumis"
        description="Les auditeurs n&apos;ont pas encore soumis de travaux."
      />
    )
  }

  const pendingReview = assessments.filter((a) =>
    (reviewStage === 'lead_review' && a.status === 'submitted') ||
    (reviewStage === 'associate_review' && a.status === 'in_review')
  )
  const approved = assessments.filter((a) => a.status === 'approved')
  const rejected = assessments.filter((a) => a.status === 'rejected')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Revue &amp; validation interne</h3>
          <p className="text-sm text-gray-600">
            {isAssociate ? 'Validation finale en tant qu\u2019associ\u00e9.' : 'Revue en tant que chef de mission.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge label={`${pendingReview.length} \u00e0 revoir`} variant="blue" />
          <Badge label={`${approved.length} approuv\u00e9s`} variant="green" />
          {rejected.length > 0 && <Badge label={`${rejected.length} rejet\u00e9s`} variant="red" />}
        </div>
      </div>

      {reviewError && <ErrorAlert message={reviewError} />}

      <div className="space-y-4">
        {assessments.map((assessment) => (
          <ReviewAssessmentCard
            key={assessment.id}
            assessment={assessment}
            reviewStage={reviewStage}
            onReview={handleReview}
            reviewing={reviewing}
          />
        ))}
      </div>
    </div>
  )
}
