import { useMemo, useState, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { useAuditorAssessments } from '../useAuditorAssessments'
import { useReviewAssessments } from '../useReviewAssessments'
import { useFieldworkState } from './useFieldworkState'
import { FieldworkSidebar } from './FieldworkSidebar'
import { ControlWorkArea } from './ControlWorkArea'
import { RightRail } from './right-rail/RightRail'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { EmptyState } from '../../../components/ui/EmptyState'
import {
  FieldworkProgressBanner,
  FieldworkLaunchReviewBanner,
  FieldworkTransitionBanner,
} from './FieldworkProgressBanner'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { MissionMemberRow, ControlAssignmentRow, MissionDetail } from '../useMissionDetail'

const RAIL_KEY = 'gestu:fieldwork-right-rail-open'

function readRailDefault(): boolean {
  try {
    const stored = localStorage.getItem(RAIL_KEY)
    if (stored !== null) return stored === 'true'
  } catch { /* ignore */ }
  return typeof window !== 'undefined' ? window.innerWidth >= 1280 : true
}

interface MissionFieldworkTabProps {
  mission: MissionDetail
  domains: DomainWithControls[]
  members: MissionMemberRow[]
  assignments: ControlAssignmentRow[]
  onRefetch: () => void
}

export function MissionFieldworkTab({ mission, domains, members, assignments, onRefetch }: MissionFieldworkTabProps) {
  const { profile } = useAuth()
  const { assessments: myAssessments, loading, error, refetch } = useAuditorAssessments(mission.id)
  const { assessments: allSubmitted } = useReviewAssessments(mission.id)

  const isLead = profile?.id === mission.lead_auditor_user?.id
  const isAssociate = profile?.id === mission.associate_user?.id
  const isLeadOrAssociate = isLead || isAssociate

  // For lead/associate: merge own + submitted by others. For auditor: own only.
  const assessments = useMemo(() => {
    if (!isLeadOrAssociate) return myAssessments
    const ids = new Set(myAssessments.map((a) => a.id))
    const merged = [...myAssessments]
    for (const a of allSubmitted) {
      if (!ids.has(a.id)) {
        merged.push(a as unknown as typeof myAssessments[0])
        ids.add(a.id)
      }
    }
    return merged
  }, [myAssessments, allSubmitted, isLeadOrAssociate])

  const state = useFieldworkState(assessments, refetch)
  const [reviewTransition, setReviewTransition] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState<boolean>(readRailDefault)
  const toggleRail = useCallback(() => {
    setRailOpen((prev) => {
      const next = !prev
      try { localStorage.setItem(RAIL_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const totalControls = domains.reduce((sum, d) => sum + d.controls.length, 0)
  const totalAssigned = assignments.length
  const totalReference = totalAssigned > 0 ? totalAssigned : totalControls

  const submittedCount = assessments.filter((a) => a.status === 'submitted' || a.status === 'in_review' || a.status === 'approved').length
  const draftCount = assessments.filter((a) => a.status === 'draft').length
  const notStartedCount = totalReference - assessments.length
  const completionPct = totalReference > 0 ? (submittedCount / totalReference) * 100 : 0
  // Propose review when ≥50% submitted or all assigned done
  const canLaunchReview = isLeadOrAssociate && submittedCount > 0 && mission.status === 'fieldwork' && (completionPct >= 50 || notStartedCount === 0)

  const handleLaunchReview = useCallback(async () => {
    setReviewTransition(null)
    const { error: updateError } = await supabase
      .from('missions')
      .update({ status: 'internal_review' })
      .eq('id', mission.id)
    if (updateError) {
      console.error('[MissionFieldworkTab] launch review:', updateError.message)
      setReviewTransition('Erreur lors de la transition.')
      return
    }
    setReviewTransition('Mission passée en revue interne.')
    onRefetch()
  }, [mission.id, onRefetch])

  // Filter assignments: auditors see only their own, lead/associate see all
  const filteredAssignments = useMemo(() => {
    if (isLeadOrAssociate) return assignments
    if (!profile) return []
    return assignments.filter((a) => a.auditor_id === profile.id)
  }, [assignments, profile, isLeadOrAssociate])

  // Filter domains: only show domains with at least one assigned control for this user
  const filteredDomains = useMemo(() => {
    if (isLeadOrAssociate) return domains
    const assignedControlIds = new Set(filteredAssignments.map((a) => a.control_id))
    return domains
      .map((d) => ({ ...d, controls: d.controls.filter((c) => assignedControlIds.has(c.id)) }))
      .filter((d) => d.controls.length > 0)
  }, [domains, filteredAssignments, isLeadOrAssociate])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (!isLeadOrAssociate && filteredAssignments.length === 0 && assessments.length === 0) {
    return (
      <EmptyState
        title="Aucun contrôle affecté"
        description="Les contrôles vous seront affectés par le chef de mission dans l’onglet Planification."
      />
    )
  }

  const selectedAssessment = assessments.find((a) => a.control_id === state.selectedId)
  const reviewerRole: 'lead' | 'associate' | 'none' = isLead ? 'lead' : isAssociate ? 'associate' : 'none'
  const isReviewerForSelected = isLeadOrAssociate && !!selectedAssessment && selectedAssessment.auditor_id !== profile?.id
  const selectedReviewAssessment = selectedAssessment ? allSubmitted.find((a) => a.id === selectedAssessment.id) : undefined
  const leadHasApprovedSelected = selectedReviewAssessment?.validations?.some(
    (v) => v.stage === 'lead_review' && v.decision === 'approved'
  ) ?? false

  return (
    <div>
      <FieldworkProgressBanner
        visible={!canLaunchReview && mission.status === 'fieldwork' && isLeadOrAssociate && totalReference > 0}
        submittedCount={submittedCount}
        totalReference={totalReference}
        draftCount={draftCount}
        notStartedCount={notStartedCount}
        completionPct={completionPct}
      />
      <FieldworkLaunchReviewBanner
        visible={canLaunchReview}
        submittedCount={submittedCount}
        totalReference={totalReference}
        draftCount={draftCount}
        notStartedCount={notStartedCount}
        onLaunch={() => void handleLaunchReview()}
      />
      <FieldworkTransitionBanner message={reviewTransition} />

      <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        <div className="w-80 shrink-0 overflow-y-auto">
          <FieldworkSidebar
            domains={filteredDomains}
            assessments={assessments}
            assignments={filteredAssignments}
            members={members}
            selectedControlId={state.selectedId}
            onSelectControl={state.selectControl}
          />
        </div>

        {selectedAssessment ? (
          <ControlWorkArea
            assessment={selectedAssessment}
            mode={state.mode}
            guidedStep={state.guidedStep}
            autoAdvance={state.autoAdvance}
            saving={state.saving}
            saveError={state.saveError}
            isReviewer={isReviewerForSelected}
            reviewerRole={reviewerRole}
            leadApproved={leadHasApprovedSelected}
            onModeChange={state.setMode}
            onGuidedStepChange={state.setGuidedStep}
            onToggleAutoAdvance={state.toggleAutoAdvance}
            onSave={state.saveAssessment}
            onSubmit={state.submitAssessment}
            onApprove={state.approveAssessment}
            onReject={state.rejectAssessment}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#FAFAF8]">
            <div className="text-center max-w-sm px-6">
              <div className="w-12 h-12 rounded-full bg-forest-50 border border-forest-200 mx-auto mb-3 flex items-center justify-center">
                <ArrowLeft size={20} className="text-forest-700" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">S&eacute;lectionnez un contr&ocirc;le</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                {assessments.length} contr&ocirc;le{assessments.length > 1 ? 's' : ''} disponible{assessments.length > 1 ? 's' : ''} dans la liste &agrave; gauche.
                {draftCount > 0 && (
                  <> {draftCount} en brouillon &mdash; commencez ou reprenez votre travail.</>
                )}
              </p>
            </div>
          </div>
        )}

        <RightRail
          mission={mission}
          assessment={selectedAssessment ?? null}
          collapsed={!railOpen}
          onToggle={toggleRail}
        />
      </div>
    </div>
  )
}
