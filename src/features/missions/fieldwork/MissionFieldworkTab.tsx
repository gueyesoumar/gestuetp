import { useMemo, useState, useCallback } from 'react'
import { ArrowRight, Check, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { supabase } from '../../../lib/supabase'
import { useAuditorAssessments } from '../useAuditorAssessments'
import { useReviewAssessments } from '../useReviewAssessments'
import { useFieldworkState } from './useFieldworkState'
import { FieldworkSidebar } from './FieldworkSidebar'
import { ControlWorkArea } from './ControlWorkArea'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { EmptyState } from '../../../components/ui/EmptyState'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { MissionMemberRow, ControlAssignmentRow, MissionDetail } from '../useMissionDetail'

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

  // Determine role of current user in this mission
  const isLead = profile?.id === mission.lead_auditor_user?.id
  const isAssociate = profile?.id === mission.associate_user?.id
  const isLeadOrAssociate = isLead || isAssociate

  // For lead/associate: merge all assessments (own + submitted by others)
  // For auditor: only own assessments
  const assessments = useMemo(() => {
    if (!isLeadOrAssociate) return myAssessments
    // Merge: start with own assessments, add submitted ones not already included
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

  // Count controls and assessments
  const totalControls = domains.reduce((sum, d) => sum + d.controls.length, 0)
  const totalAssigned = assignments.length
  const totalReference = totalAssigned > 0 ? totalAssigned : totalControls

  const submittedCount = assessments.filter((a) => a.status === 'submitted' || a.status === 'in_review' || a.status === 'approved').length
  const draftCount = assessments.filter((a) => a.status === 'draft').length
  const notStartedCount = totalReference - assessments.length
  // Only propose review if at least 50% of controls are submitted or all assigned are done
  const completionPct = totalReference > 0 ? (submittedCount / totalReference) * 100 : 0
  const canLaunchReview = isLeadOrAssociate && submittedCount > 0 && mission.status === 'fieldwork' && (completionPct >= 50 || notStartedCount === 0)

  const handleLaunchReview = useCallback(async () => {
    setReviewTransition(null)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/missions?id=eq.${mission.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: 'internal_review' }),
    })
    if (res.ok) {
      setReviewTransition('Mission pass\u00e9e en revue interne.')
      onRefetch()
    } else {
      setReviewTransition('Erreur lors de la transition.')
    }
  }, [mission.id, onRefetch])

  // Filter assignments: auditors see only their own, lead/associate see all
  const filteredAssignments = useMemo(() => {
    if (isLeadOrAssociate) return assignments
    if (!profile) return []
    return assignments.filter((a) => a.auditor_id === profile.id)
  }, [assignments, profile, isLeadOrAssociate])

  // Filter domains: only show domains that have at least one assigned control for this user
  const filteredDomains = useMemo(() => {
    if (isLeadOrAssociate) return domains
    const assignedControlIds = new Set(filteredAssignments.map((a) => a.control_id))
    return domains
      .map((d) => ({
        ...d,
        controls: d.controls.filter((c) => assignedControlIds.has(c.id)),
      }))
      .filter((d) => d.controls.length > 0)
  }, [domains, filteredAssignments, isLeadOrAssociate])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  // Lead/associate always sees all domains; auditors need assignments
  if (!isLeadOrAssociate && filteredAssignments.length === 0 && assessments.length === 0) {
    return (
      <EmptyState
        title={'Aucun contr\u00f4le affect\u00e9'}
        description={'Les contr\u00f4les vous seront affect\u00e9s par le chef de mission dans l\u2019onglet Planification.'}
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
      {/* Review launch banner */}
      {/* Progress banner when review not yet available */}
      {!canLaunchReview && mission.status === 'fieldwork' && isLeadOrAssociate && totalReference > 0 && (
        <div className="flex items-center gap-4 p-4 mb-4 bg-white border border-gray-200 rounded-xl">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Progression : {submittedCount}/{totalReference} contr&ocirc;les soumis
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {draftCount > 0 ? `${draftCount} en brouillon. ` : ''}{notStartedCount > 0 ? `${notStartedCount} non commenc\u00e9${notStartedCount > 1 ? 's' : ''}.` : ''}
            </p>
          </div>
          <div className="w-32">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-2 bg-forest-500 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 text-right mt-1">{Math.round(completionPct)}%</p>
          </div>
        </div>
      )}

      {canLaunchReview && (
        <div className="flex items-center justify-between p-4 mb-4 bg-forest-50 border border-forest-300 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-forest-900">
              {notStartedCount === 0 && draftCount === 0
                ? `Tous les contr\u00f4les sont soumis (${submittedCount}/${totalReference}).`
                : `${submittedCount}/${totalReference} contr\u00f4les soumis.${draftCount > 0 ? ` ${draftCount} en brouillon.` : ''}${notStartedCount > 0 ? ` ${notStartedCount} non commenc\u00e9${notStartedCount > 1 ? 's' : ''}.` : ''}`}
            </p>
            <p className="text-xs text-forest-600 mt-0.5">
              {notStartedCount === 0 && draftCount === 0
                ? 'Vous pouvez lancer la revue interne.'
                : 'Vous pouvez lancer la revue sans attendre les contr\u00f4les restants.'}
            </p>
          </div>
          <button onClick={handleLaunchReview}
            className="px-5 py-2.5 bg-forest-700 text-white rounded-lg text-[13px] font-semibold hover:bg-forest-900 transition-colors shrink-0">
            <ArrowRight size={14} className="inline" /> Lancer la revue interne
          </button>
        </div>
      )}
      {reviewTransition && (
        <div className="p-3 mb-4 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700">
          <Check size={14} className="inline mr-1" />{reviewTransition}
        </div>
      )}

    <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
      {/* Left panel */}
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

      {/* Right panel */}
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
        <div className="flex-1 flex items-center justify-center text-sm text-gray-300">
          <ArrowLeft size={14} className="inline mr-1" />S{'\u00e9'}lectionnez un contr{'\u00f4'}le dans la liste
        </div>
      )}
    </div>
    </div>
  )
}
