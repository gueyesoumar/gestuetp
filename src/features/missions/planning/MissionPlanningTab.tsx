import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useFeatureFlag } from '../../../hooks/useFeatureFlag'
import { usePlanningData } from './usePlanningData'
import { useSavePlanning } from './useSavePlanning'
import { useAssignControls } from '../useAssignControls'
import { useInterviews } from './useInterviews'
import { generateWorkProgram } from './generateWorkProgram'
import { generateInterviewPlan } from './generateInterviews'
import { WorkProgramTable } from './WorkProgramTable'
import { InterviewsPanel } from './InterviewsPanel'
import { InterviewFormModal } from './InterviewFormModal'
import { InterviewEditModal } from './InterviewEditModal'
import { PlanningBudgetBanner } from './PlanningBudgetBanner'
import { PlanningWorkloadSection } from './PlanningWorkloadSection'
import { PlanningGanttSection } from './PlanningGanttSection'
import { PlanningNextInterview } from './PlanningNextInterview'
import { PlanningActionsSection } from './PlanningActionsSection'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { MissionMemberRow, ControlAssignmentRow, MissionDetail } from '../useMissionDetail'

interface MissionPlanningTabProps {
  mission: MissionDetail
  domains: DomainWithControls[]
  members: MissionMemberRow[]
  assignments: ControlAssignmentRow[]
  onRefetch: () => void
}

type PlanTab = 'programme' | 'entretiens'

export function MissionPlanningTab({ mission, domains, members, assignments, onRefetch }: MissionPlanningTabProps) {
  const { plannings, interviews, contacts, loading, error, refetch: refetchPlanning } = usePlanningData(mission.id)
  const { upsertPlanning, batchUpsert } = useSavePlanning(refetchPlanning)
  const { assignControls } = useAssignControls(onRefetch)
  const { createInterview, updateInterview, deleteInterview, createContact, saving: interviewSaving, error: interviewError } = useInterviews(refetchPlanning)
  const [activeTab, setActiveTab] = useState<PlanTab>('programme')
  const [showInterviewModal, setShowInterviewModal] = useState(false)
  const [editingInterview, setEditingInterview] = useState<import('../../../types/database.types').InterviewSchedule | null>(null)
  const [generatingInterviews, setGeneratingInterviews] = useState(false)
  const [generating, setGenerating] = useState(false)
  const planFlag = useFeatureFlag('smart_plan_mission')
  const [genSuccess, setGenSuccess] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const totalControls = domains.reduce((s, d) => s + d.controls.length, 0)

  const handlePlanningChange = useCallback((controlId: string, field: string, value: unknown) => {
    upsertPlanning(mission.id, controlId, { [field]: value })
  }, [mission.id, upsertPlanning])

  const handleAssign = useCallback((controlId: string, auditorId: string) => {
    assignControls(mission.id, [{ control_id: controlId, auditor_id: auditorId }])
  }, [mission.id, assignControls])

  const handleAssignDomain = useCallback((controlIds: string[], auditorId: string) => {
    assignControls(mission.id, controlIds.map((id) => ({ control_id: id, auditor_id: auditorId })))
  }, [mission.id, assignControls])

  const handleGenerateInterviews = useCallback(async () => {
    setGeneratingInterviews(true)
    setGenSuccess(null)

    const plan = generateInterviewPlan(
      mission.id, domains, plannings, assignments, contacts,
      mission.start_date, mission.end_date
    )

    if (plan.length === 0) {
      setGenSuccess('Aucun entretien \u00e0 g\u00e9n\u00e9rer. V\u00e9rifiez que le programme de travail contient des contr\u00f4les avec la technique "entretien".')
      setGeneratingInterviews(false)
      return
    }

    let created = 0
    for (const entry of plan) {
      const ok = await createInterview(entry)
      if (ok) created++
    }

    setGeneratingInterviews(false)
    setGenSuccess(`${created} entretien${created > 1 ? 's' : ''} g\u00e9n\u00e9r\u00e9${created > 1 ? 's' : ''} automatiquement.`)
    refetchPlanning()
  }, [mission, domains, plannings, assignments, contacts, createInterview, refetchPlanning])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setGenSuccess(null)

    // 1. Call AI Edge Function
    const { data, error: fnError } = await supabase.functions.invoke('smart-plan', {
      body: { mission_id: mission.id },
    })

    if (fnError || data?.error) {
      let detail = fnError?.message ?? data?.error ?? 'Erreur inconnue'
      try {
        const ctx = (fnError as unknown as { context?: { json?: () => Promise<{ error?: string }> } })?.context
        if (ctx?.json) {
          const body = await ctx.json()
          if (body?.error) detail = body.error
        }
      } catch { /* */ }
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

    // 2. Save AI-generated plannings
    const aiControls = (data.controls ?? []) as { id: string; risk_level: string; audit_techniques: string[]; estimated_hours: number; sampling_population: number | null; sampling_size: number | null; notes: string | null }[]
    const aiAssignments = (data.assignments ?? []) as { control_id: string; auditor_id: string }[]

    const planEntries = aiControls.map((c) => ({
      mission_id: mission.id,
      control_id: c.id,
      risk_level: c.risk_level as 'critical' | 'high' | 'medium' | 'low',
      audit_techniques: c.audit_techniques as ('inspection' | 'entretien' | 'observation' | 'reexecution' | 'echantillon' | 'analytique')[],
      estimated_hours: c.estimated_hours,
      sampling_population: c.sampling_population ?? undefined,
      sampling_size: c.sampling_size ?? undefined,
      notes: c.notes ?? undefined,
    }))

    const planOk = await batchUpsert(planEntries)

    // 3. Save all assignments (upsert — reassigne si deja affecte)
    if (aiAssignments.length > 0) {
      await assignControls(mission.id, aiAssignments)
    }

    setGenerating(false)
    if (planOk) {
      const stats = data.stats ?? {}
      setGenSuccess(`Programme IA g\u00e9n\u00e9r\u00e9 : ${stats.planned ?? aiControls.length} contr\u00f4les analys\u00e9s, ${aiAssignments.length} affectations.`)
      refetchPlanning()
      onRefetch()
    }
  }, [mission.id, domains, members, assignments, batchUpsert, assignControls, refetchPlanning, onRefetch])

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

        {/* Sub-tabs */}
        <div className="flex border-b border-gray-200 bg-[#FAFAFA]">
          <TabBtn label="Programme de travail" count={totalControls} active={activeTab === 'programme'} onClick={() => setActiveTab('programme')} />
          <TabBtn label="Entretiens" count={interviews.length} active={activeTab === 'entretiens'} onClick={() => setActiveTab('entretiens')} />
        </div>

        {/* Tab content */}
        {activeTab === 'programme' && (
          <WorkProgramTable domains={domains} plannings={plannings} assignments={assignments} members={members} onPlanningChange={handlePlanningChange} onAssign={handleAssign} onAssignDomain={handleAssignDomain} />
        )}
        {activeTab === 'entretiens' && (
          <InterviewsPanel interviews={interviews} contacts={contacts}
            onAdd={() => setShowInterviewModal(true)}
            onEdit={(iv) => setEditingInterview(iv)}
            onStatusChange={(id, status) => updateInterview(id, { status })}
            onDelete={(id) => deleteInterview(id)}
            onAutoGenerate={handleGenerateInterviews}
            generating={generatingInterviews}
            saving={interviewSaving} />
        )}
      </div>

      {/* Interview modal */}
      {showInterviewModal && (
        <InterviewFormModal
          missionId={mission.id}
          members={members}
          contacts={contacts}
          onCreateInterview={async (data) => {
            return createInterview({
              mission_id: data.mission_id,
              title: data.title,
              auditor_id: data.auditor_id,
              contact_id: data.contact_id ?? undefined,
              scheduled_date: data.scheduled_date,
              scheduled_time: data.scheduled_time,
              duration_minutes: data.duration_minutes,
              location: data.location || undefined,
              notes: data.notes || undefined,
            })
          }}
          onCreateContact={async (data) => {
            return createContact({
              mission_id: data.mission_id,
              name: data.name,
              job_title: data.job_title || undefined,
              department: data.department || undefined,
            })
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
          contacts={contacts}
          domains={domains}
          missionName={mission.name}
          onUpdate={updateInterview}
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
          <PlanningActionsSection assignedCount={assignments.length} totalControls={totalControls} onValidate={async () => {
            const session = await supabase.auth.getSession()
            const token = session.data.session?.access_token
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/missions?id=eq.${mission.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}`, 'Prefer': 'return=minimal' },
              body: JSON.stringify({ status: 'fieldwork' }),
            })
            if (res.ok) {
              setGenSuccess('Planification valid\u00e9e. La mission passe en phase Travaux.')
              onRefetch()
            } else {
              setGenSuccess('Erreur lors de la validation.')
            }
          }} />
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
