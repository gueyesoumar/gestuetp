import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useReviewAssessments } from '../useReviewAssessments'
import { ValidationKanbanColumn } from './ValidationKanbanColumn'
import { ValidationDetailPanel } from './ValidationDetailPanel'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { EmptyState } from '../../../components/ui/EmptyState'
import { KANBAN_COLUMNS } from '../mission-constants'
import type { MissionDetail } from '../useMissionDetail'
import type { ReviewAssessment } from '../useReviewAssessments'

interface MissionReviewTabProps {
  mission: MissionDetail
}

export function MissionReviewTab({ mission }: MissionReviewTabProps){
  const { profile } = useAuth()
  const { assessments, loading, error, refetch } = useReviewAssessments(mission.id)
  const [selected, setSelected] = useState<ReviewAssessment | null>(null)

  const isLead = profile?.id === mission.lead_auditor_user?.id
  const isAssociate = profile?.id === mission.associate_user?.id
  const reviewStage = isAssociate ? 'associate_review' as const : 'lead_review' as const

  const columns = useMemo(() => {
    const map: Record<string, ReviewAssessment[]> = {
      submitted: [], lead_review: [], associate_review: [], client_review: [], validated: [],
    }
    for (const a of assessments) {
      const hasLead = a.validations.some((v) => v.stage === 'lead_review' && v.decision === 'approved')
      const hasAssociate = a.validations.some((v) => v.stage === 'associate_review' && v.decision === 'approved')
      const hasClient = a.validations.some((v) => v.stage === 'client_review' && v.decision === 'approved')

      if (a.status === 'approved' && hasClient) map.validated.push(a)
      else if (hasAssociate) map.client_review.push(a)
      else if (hasLead && a.status === 'in_review') map.associate_review.push(a)
      else if (a.status === 'submitted') map.submitted.push(a)
      else if (a.status === 'in_review' && !hasLead) map.lead_review.push(a)
      else if (a.status === 'approved') map.validated.push(a)
      else map.submitted.push(a)
    }
    return map
  }, [assessments])

  const handleCardClick = useCallback((a: ReviewAssessment) => setSelected(a), [])
  const handleClose = useCallback(() => setSelected(null), [])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  if (!isLead && !isAssociate) {
    return <EmptyState title="Acc&egrave;s r&eacute;serv&eacute;" description="Seuls le chef de mission et l&apos;associ&eacute; peuvent valider." />
  }
  if (assessments.length === 0) {
    return <EmptyState title="Aucun contr&ocirc;le soumis" description="Les auditeurs n&apos;ont pas encore soumis de travaux." />
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-gray-900">Pipeline de validation</h3>
          <p className="text-[13px] text-gray-500 mt-0.5">Suivez le parcours de chaque contr&ocirc;le.</p>
        </div>
        <div className="flex gap-2">
          <StatBadge count={columns.submitted.length + columns.lead_review.length} label="en cours" color="blue" />
          <StatBadge count={columns.validated.length} label="valid&eacute;s" color="green" />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3" style={{ minHeight: '400px' }}>
        {KANBAN_COLUMNS.map((col) => (
          <ValidationKanbanColumn
            key={col.key}
            title={col.label}
            color={col.color}
            assessments={columns[col.key] ?? []}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      {selected && (
        <ValidationDetailPanel
          assessment={selected}
          reviewStage={reviewStage}
          onClose={handleClose}
          onReviewed={refetch}
        />
      )}
    </div>
  )
}

function StatBadge({ count, label, color }: { count: number; label: string; color: 'blue' | 'green' }){
  const styles = color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles}`}>{count} {label}</span>
}
