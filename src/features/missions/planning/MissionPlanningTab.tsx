import { useState, useCallback, useEffect } from 'react'
import { isStepEnabled } from '../mission-constants'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'
import { AiPreflightPanel } from '../../../components/ui/AiPreflightPanel'
import { isAiSkip } from '../aiSkip'
import { useFeatureFlag } from '../../../hooks/useFeatureFlag'
import { usePlanningData } from './usePlanningData'
import { useSavePlanning } from './useSavePlanning'
import { useAssignControls } from '../useAssignControls'
import { useInterviews } from './useInterviews'
import { useInterviewRelations } from './useInterviewRelations'
import { generateWorkProgram } from './generateWorkProgram'
import { WorkProgramTable, type WorkFilter } from './WorkProgramTable'
import { useMissionExclusions } from './useMissionExclusions'
import { InterviewsPanel } from './InterviewsPanel'
import { InterviewFormModal } from './InterviewFormModal'
import { InterviewEditModal } from './InterviewEditModal'
import { PlanningBudgetBanner } from './PlanningBudgetBanner'
import { PlanningValidationGate } from './PlanningValidationGate'
import { SmartPlanPreviewModal } from './SmartPlanPreviewModal'
import type { SmartPlanProposal, SmartPlanAssignment } from './SmartPlanPreviewModal'
import { PlanningWorkloadSection } from './PlanningWorkloadSection'
import { PlanningGanttSection } from './PlanningGanttSection'
import { PlanningNextInterview } from './PlanningNextInterview'
import { PlanningActionsSection } from './PlanningActionsSection'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { MissionMemberRow, ControlAssignmentRow, MissionDetail } from '../useMissionDetail'
import type { InterviewWithRelations } from './usePlanningData'
import type { RiskLevel, AuditTechnique, ControlPlanningInsert } from '../../../types/database.types'

interface MissionPlanningTabProps {
  mission: MissionDetail
  domains: DomainWithControls[]
  members: MissionMemberRow[]
  assignments: ControlAssignmentRow[]
  onRefetch: () => void
  /** Naviguer vers une autre phase de la mission (ex. Cadrage pour les acteurs). */
  onGoToPhase?: (tab: string) => void
}

type PlanTab = 'programme' | 'entretiens'

export function MissionPlanningTab({ mission, domains, members, assignments, onRefetch, onGoToPhase }: MissionPlanningTabProps) {
  const { interviews, contacts, loading, error, refetch: refetchPlanning } = usePlanningData(mission.id)
  const { batchUpsert, saving: planSaving } = useSavePlanning(refetchPlanning)
  const { assignControls, assigning } = useAssignControls(onRefetch)
  const bulkSaving = planSaving || assigning
  const { createInterview, updateInterview, deleteInterview, saving: interviewSaving, error: interviewError } = useInterviews(refetchPlanning)
  const { syncActors } = useInterviewRelations()
  const [activeTab, setActiveTab] = useState<PlanTab>('programme')
  // Sous-étape Entretiens désélectionnable via le template (RFC 0009).
  const showInterviews = isStepEnabled(mission, 'planning.interviews')
  useEffect(() => { if (!showInterviews && activeTab === 'entretiens') setActiveTab('programme') }, [showInterviews, activeTab])
  // Les acteurs (interlocuteurs) se gèrent au Cadrage ; la planif les consomme
  // seulement (sélection dans le formulaire d'entretien). `contacts` vient de
  // usePlanningData -> disponible pour le gate et les modales sans écran dédié.
  const goTab = useCallback((next: PlanTab) => setActiveTab(next), [])
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [editingInterview, setEditingInterview] = useState<InterviewWithRelations | null>(null)
  const [generating, setGenerating] = useState(false)
  const planFlag = useFeatureFlag('smart_plan_mission')
  const [genSuccess, setGenSuccess] = useState<string | null>(null)
  const [aiSkip, setAiSkip] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [workFilter, setWorkFilter] = useState<WorkFilter>('all')
  const excludedControlIds = useMissionExclusions(mission.id)
  // « Corriger » d'un prérequis du gate : cible les contrôles concernés (filtre la
  // table) ou route vers l'onglet qui porte le correctif (acteurs / entretiens).
  const handleGateFix = useCallback((key: string): void => {
    if (key === 'assigned') { setWorkFilter('noauditor'); setActiveTab('programme') }
    else if (key === 'actors') onGoToPhase?.('scoping')
    else setActiveTab('entretiens')
  }, [onGoToPhase])
  const [preview, setPreview] = useState<{ proposals: SmartPlanProposal[]; assignments: SmartPlanAssignment[] } | null>(null)
  const [applyingPreview, setApplyingPreview] = useState(false)
  const [validating, setValidating] = useState(false)
  const [serverMissing, setServerMissing] = useState<{ key: string; label: string; count: number; total: number }[] | null>(null)

  const handleValidatePlanning = useCallback(async (): Promise<void> => {
    setValidating(true)
    setServerMissing(null)
    const { data, error: rpcError } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)('transition_mission_to_fieldwork', {
      p_mission_id: mission.id,
    })
    setValidating(false)

    if (rpcError) {
      console.error('transition_mission_to_fieldwork:', rpcError.message)
      setGenSuccess('Erreur lors de la validation.')
      return
    }

    const result = data as { ok: boolean; error?: string; missing?: { key: string; label: string; count: number; total: number }[] } | null
    if (result?.ok) {
      setGenSuccess('Planification validée. La mission passe en phase Travaux.')
      onRefetch()
      refetchPlanning()
      return
    }

    // Server rejected the transition - show the missing items
    if (result?.missing && result.missing.length > 0) {
      setServerMissing(result.missing)
      setGenSuccess('Validation refusée par le serveur. Vérifiez les prérequis ci-dessus.')
      refetchPlanning()
    } else {
      const errCode = result?.error ?? 'unknown'
      setGenSuccess(`Validation refusée (${errCode}).`)
    }
  }, [mission.id, onRefetch, refetchPlanning])


  const totalControls = domains.reduce((s, d) => s + d.controls.length, 0)
  const handleAssign = useCallback((controlId: string, auditorId: string) => {
    assignControls(mission.id, [{ control_id: controlId, auditor_id: auditorId }])
  }, [mission.id, assignControls])

  const handleAssignDomain = useCallback((controlIds: string[], auditorId: string) => {
    assignControls(mission.id, controlIds.map((id) => ({ control_id: id, auditor_id: auditorId })))
  }, [mission.id, assignControls])

  const handleBulkAssign = useCallback(async (controlIds: string[], auditorId: string): Promise<void> => {
    if (controlIds.length === 0) return
    await assignControls(mission.id, controlIds.map((id) => ({ control_id: id, auditor_id: auditorId })))
  }, [mission.id, assignControls])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setGenSuccess(null)
    setAiSkip(null)

    // 1. Call AI Edge Function
    const { data, error: fnError } = await supabase.functions.invoke('smart-plan', {
      body: { mission_id: mission.id },
    })

    if (isAiSkip(data?.skipped_reason)) {
      setAiSkip(data.skipped_reason)
      setGenerating(false)
      return
    }

    if (fnError || data?.error) {
      const detail = await readInvokeError(fnError, data, 'Erreur inconnue')
      console.error('SmartPlan error:', detail, 'data:', data)
      // Fallback: use local rule-based generation
      const result = generateWorkProgram(mission.id, domains, members, assignments)
      const planOk = await batchUpsert(result.plannings)
      if (result.assignments.length > 0) await assignControls(mission.id, result.assignments)
      setGenerating(false)
      if (planOk) {
        setGenSuccess(`Programme g\u00e9n\u00e9r\u00e9 (mode local) : ${result.plannings.length} contr\u00f4les planifi\u00e9s.`)
        refetchPlanning()
        onRefetch()
      } else {
        setGenSuccess('Erreur lors de la g\u00e9n\u00e9ration.')
      }
      return
    }

    // 2. Open preview modal - user decides what to apply
    const aiControls = (data.controls ?? []) as { id: string; risk_level: string; audit_techniques: string[]; estimated_hours: number; sampling_population: number | null; sampling_size: number | null; notes: string | null; reasoning?: string | null }[]
    const aiAssignments = (data.assignments ?? []) as { control_id: string; auditor_id: string }[]

    const proposals: SmartPlanProposal[] = aiControls.map((c) => ({
      id: c.id,
      risk_level: c.risk_level as RiskLevel,
      audit_techniques: c.audit_techniques as AuditTechnique[],
      estimated_hours: c.estimated_hours,
      sampling_population: c.sampling_population,
      sampling_size: c.sampling_size,
      notes: c.notes,
      reasoning: c.reasoning ?? null,
    }))

    setGenerating(false)
    setPreview({ proposals, assignments: aiAssignments })
  }, [mission.id, domains, members, assignments, batchUpsert, assignControls, refetchPlanning, onRefetch])

  const handleApplyPreview = useCallback(async (selectedIds: Set<string>): Promise<void> => {
    if (!preview) return
    setApplyingPreview(true)

    const filteredProposals = preview.proposals.filter((p) => selectedIds.has(p.id))
    const filteredAssignments = preview.assignments.filter((a) => selectedIds.has(a.control_id))

    const planEntries: ControlPlanningInsert[] = filteredProposals.map((c) => ({
      mission_id: mission.id,
      control_id: c.id,
      risk_level: c.risk_level,
      audit_techniques: c.audit_techniques,
      estimated_hours: c.estimated_hours,
      sampling_population: c.sampling_population ?? undefined,
      sampling_size: c.sampling_size ?? undefined,
      notes: c.notes ?? undefined,
    }))

    const planOk = planEntries.length === 0 ? true : await batchUpsert(planEntries)

    if (filteredAssignments.length > 0) {
      await assignControls(mission.id, filteredAssignments)
    }

    setApplyingPreview(false)
    setPreview(null)
    if (planOk) {
      setGenSuccess(`SmartPlan appliqu\u00e9 : ${filteredProposals.length} contr\u00f4le${filteredProposals.length > 1 ? 's' : ''} mis \u00e0 jour, ${filteredAssignments.length} affectation${filteredAssignments.length > 1 ? 's' : ''}.`)
      refetchPlanning()
      onRefetch()
    }
  }, [preview, mission.id, batchUpsert, assignControls, refetchPlanning, onRefetch])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white relative" style={{ minHeight: '660px' }}>
      {/* MAIN PANEL (full width when sidebar closed) */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* AI banner */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-50 border-b border-purple-200">
          <div className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center text-sm shrink-0">{'\u2733'}</div>
          <div className="flex-1">
            <p className="text-xs text-purple-800"><strong>SmartPlan</strong> peut g{'\u00e9'}n{'\u00e9'}rer le programme de travail complet.</p>
          </div>
          {!planFlag.loading && planFlag.enabled && (
            <button onClick={handleGenerate} disabled={generating}
              className="text-xs font-semibold text-white bg-purple-500 px-3 py-1.5 rounded-lg hover:bg-purple-600 disabled:opacity-50 shrink-0 flex items-center gap-1.5">
              {generating && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {generating ? 'Analyse IA en cours...' : '\u2733 G\u00e9n\u00e9rer'}
            </button>
          )}

          {/* Sidebar toggle */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`ml-2 w-8 h-8 flex items-center justify-center rounded-lg border text-xs transition-colors shrink-0 ${
              sidebarOpen ? 'bg-forest-700 text-white border-forest-700' : 'bg-white text-gray-400 border-gray-200 hover:border-forest-300 hover:text-forest-700'
            }`}
            title={sidebarOpen ? 'Masquer le panneau' : 'Afficher budget, charge, calendrier'}>
            {sidebarOpen ? '\u2715' : '\u2630'}
          </button>
        </div>

        {/* Generation feedback */}
        {generating && (
          <div className="px-4 py-3 bg-purple-100 border-b border-purple-200 flex items-center gap-3">
            <span className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin shrink-0" />
            <div>
              <p className="text-xs font-semibold text-purple-800">Analyse IA en cours...</p>
              <p className="text-[10px] text-purple-500">Claude analyse le contexte client, les r{'\u00e9'}ponses au questionnaire et les risques identifi{'\u00e9'}s pour g{'\u00e9'}n{'\u00e9'}rer un programme adapt{'\u00e9'}.</p>
            </div>
          </div>
        )}
        {genSuccess && !generating && (
          <div className={`px-4 py-2.5 border-b flex items-center justify-between ${genSuccess.includes('Erreur') ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className={`text-xs font-medium ${genSuccess.includes('Erreur') ? 'text-red-700' : 'text-green-700'}`}>
              {genSuccess.includes('Erreur') ? '\u26A0' : '\u2713'} {genSuccess}
            </p>
            <button onClick={() => setGenSuccess(null)} className="text-xs text-gray-400 hover:text-gray-600">{'\u2715'}</button>
          </div>
        )}
        {aiSkip && (
          <div className="px-4 py-2.5 border-b border-gray-100">
            <AiPreflightPanel reason={aiSkip} onDismiss={() => setAiSkip(null)} />
          </div>
        )}

        {/* Validation gate */}
        {activeTab === 'programme' && (
          <PlanningValidationGate
            domains={domains}
            assignments={assignments}
            contacts={contacts}
            interviews={interviews}
            validating={validating}
            serverMissing={serverMissing}
            onValidate={handleValidatePlanning}
            showInterviewChecks={showInterviews}
            onFix={handleGateFix}
            excludedControlIds={excludedControlIds}
          />
        )}


        {/* Sub-tabs */}
        <div className="flex border-b border-gray-200 bg-[#FAFAFA]">
          <TabBtn label="Programme de travail" count={totalControls} active={activeTab === 'programme'} onClick={() => goTab('programme')} />
          {showInterviews && (
            <TabBtn label="Entretiens" count={interviews.length} active={activeTab === 'entretiens'} onClick={() => goTab('entretiens')} />
          )}
        </div>

        {/* Tab content */}
        {activeTab === 'programme' && (
          <WorkProgramTable
            missionId={mission.id}
            domains={domains}
            assignments={assignments}
            members={members}
            onAssign={handleAssign}
            onAssignDomain={handleAssignDomain}
            onBulkAssign={handleBulkAssign}
            bulkSaving={bulkSaving}
            externalSelection={selection}
            onSelectionChange={setSelection}
            workFilter={workFilter}
            onWorkFilter={setWorkFilter}
            excludedControlIds={excludedControlIds}
          />
        )}
        {showInterviews && activeTab === 'entretiens' && (
          <InterviewsPanel interviews={interviews} contacts={contacts}
            onAdd={() => setShowInterviewModal(true)}
            onEdit={(iv) => setEditingInterview(iv)}
            onStatusChange={(id, status) => updateInterview(id, { status })}
            onDelete={(id) => deleteInterview(id)}
            saving={interviewSaving} />
        )}
      </div>

      {/* SmartPlan preview modal */}
      {preview && (
        <SmartPlanPreviewModal
          proposals={preview.proposals}
          assignments={preview.assignments}
          domains={domains}
          currentAssignments={assignments}
          members={members}
          applying={applyingPreview}
          onApply={handleApplyPreview}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Interview create modal */}
      {showInterviewModal && (
        <InterviewFormModal
          missionId={mission.id}
          members={members}
          actors={contacts}
          onCreateInterview={async (data) => {
            const ok = await createInterview({
              mission_id: data.mission_id,
              title: data.title,
              auditor_id: data.auditor_id,
              scheduled_date: data.scheduled_date,
              scheduled_time: data.scheduled_time,
              duration_minutes: data.duration_minutes,
              location: data.location || undefined,
              notes: data.notes || undefined,
            }, { topicIds: [], actorIds: data.actor_ids })
            return ok
          }}
          onClose={() => setShowInterviewModal(false)}
          saving={interviewSaving}
          error={interviewError}
        />
      )}

      {/* Interview edit modal */}
      {editingInterview && (
        <InterviewEditModal
          interview={editingInterview}
          members={members}
          actors={contacts}
          missionName={mission.name}
          onUpdate={updateInterview}
          onSyncActors={syncActors}
          onClose={() => setEditingInterview(null)}
          saving={interviewSaving}
          error={interviewError}
        />
      )}

      {/* RIGHT SIDEBAR (collapsable) */}
      {sidebarOpen && (
        <div className="w-[340px] shrink-0 flex flex-col overflow-y-auto bg-[#FAFAF8] border-l border-gray-200">
          <PlanningBudgetBanner assignments={assignments} totalControls={totalControls} />
          <PlanningWorkloadSection members={members} assignments={assignments} totalControls={totalControls} />
          <PlanningGanttSection domains={domains} startDate={mission.start_date} endDate={mission.end_date} />
          <PlanningNextInterview interviews={interviews} />
          <PlanningActionsSection />
        </div>
      )}
    </div>
  )
}

function TabBtn({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-5 py-3 text-xs font-medium relative whitespace-nowrap ${active ? 'text-forest-700 font-semibold' : 'text-gray-500 hover:text-forest-700'}`}>
      {label}
      {count !== undefined && (
        <span className={`ml-1 text-[10px] font-semibold px-1.5 rounded-full ${active ? 'bg-forest-100 text-forest-700' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
      )}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-forest-700" />}
    </button>
  )
}
