import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { EmptyState } from '../../../components/ui/EmptyState'
import { useFeatureFlag } from '../../../hooks/useFeatureFlag'
import { useMissionUserRole } from '../useMissionUserRole'
import { HeroScoreCard } from './HeroScoreCard'
import { DomainBreakdownList } from './DomainBreakdownList'
import { ClosureActionCards } from './ClosureActionCards'
import { FindingSynthesis } from './FindingSynthesis'
import { CARTracking } from './CARTracking'
import { AuditConclusion } from './AuditConclusion'
import { ReportGenerator } from './ReportGenerator'
import type { MissionDetail } from '../useMissionDetail'
import type { ControlAssessment } from '../../../types/database.types'

interface DomainScore {
  domain_code: string
  domain_name: string
  total: number
  approved: number
  score: number
}

interface ScoringData {
  conformity_score: number
  total_controls: number
  approved_controls: number
  rejected_controls: number
  pending_controls: number
  domain_scores: DomainScore[]
}

interface MissionClosureTabProps {
  mission: MissionDetail
  onRefetch: () => void
}

export function MissionClosureTab({ mission, onRefetch }: MissionClosureTabProps){
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [scoring, setScoring] = useState<ScoringData | null>(null)
  const [assessments, setAssessments] = useState<ControlAssessment[]>([])
  const isClosed = mission.status === 'closure'
  const reportFlag = useFeatureFlag('report_generator_advanced')
  const userRole = useMissionUserRole(mission)

  useEffect(() => {
    const controller = new AbortController()
    const load = async (): Promise<void> => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return
      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(
        `${baseUrl}/rest/v1/control_assessments?mission_id=eq.${mission.id}&select=id,mission_id,control_id,auditor_id,status,findings,recommendations,ai_draft,evidence_notes,observations,risk_notes,conformity_level,finding_classification,created_at,updated_at`,
        { headers: { 'apikey': apikey, 'Authorization': `Bearer ${token}` }, signal: controller.signal }
      )
      if (controller.signal.aborted) return
      if (res.ok) setAssessments((await res.json()) as ControlAssessment[])
    }
    load()
    return () => controller.abort()
  }, [mission.id])

  const handleClose = useCallback(async () => {
    setClosing(true)
    setCloseError(null)
    const { data, error: fnError } = await supabase.functions.invoke('close-mission', {
      body: { mission_id: mission.id },
    })
    if (fnError || data?.error) {
      setCloseError(fnError?.message ?? data?.error ?? 'Erreur.')
      setClosing(false)
      return
    }
    if (data?.scoring) setScoring(data.scoring as ScoringData)
    setClosing(false)
    onRefetch()
  }, [mission.id, onRefetch])

  // Auditeur sans contrôle affecté → rien à afficher.
  if (userRole.isAuditor && !userRole.loading && userRole.assignedControlIds.size === 0) {
    return (
      <EmptyState
        title="Aucun contrôle affecté"
        description="Vous n'avez pas de contrôle dans cette mission, donc aucun résultat à consulter ici."
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-gray-900">Cl&ocirc;ture &amp; livraison</h3>
        <p className="text-[13px] text-gray-500 mt-0.5">
          {isClosed ? 'Cette mission est cl&ocirc;tur&eacute;e.' : 'Cl&ocirc;turez la mission pour g&eacute;n&eacute;rer le scoring.'}
        </p>
      </div>

      {closeError && <ErrorAlert message={closeError} />}

      {!isClosed && !scoring && userRole.isPrivileged && (
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div>
            <p className="text-sm font-medium text-amber-800">Pr&ecirc;t &agrave; cl&ocirc;turer la mission ?</p>
            <p className="text-xs text-amber-600 mt-0.5">Le scoring sera calcul&eacute; et la mission passera en statut cl&ocirc;tur&eacute;.</p>
          </div>
          <button onClick={handleClose} disabled={closing}
            className="bg-amber-600 text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {closing ? 'Cl&ocirc;ture...' : 'Cl&ocirc;turer la mission'}
          </button>
        </div>
      )}

      {scoring && (
        <>
          <HeroScoreCard score={scoring.conformity_score} approvedControls={scoring.approved_controls} totalControls={scoring.total_controls} />
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard label="Conformes" value={scoring.approved_controls} color="text-green-600" bg="bg-green-50 border-green-200" />
            <StatCard label="Non conformes" value={scoring.rejected_controls} color="text-red-600" bg="bg-red-50 border-red-200" />
            <StatCard label="En attente" value={scoring.pending_controls} color="text-gray-500" bg="bg-gray-50 border-gray-200" />
          </div>
          <DomainBreakdownList domainScores={scoring.domain_scores} />
          <ClosureActionCards />
        </>
      )}

      {isClosed && !scoring && <ScoringLoader missionId={mission.id} />}

      {/* ISO 27001 closure enrichments */}
      {(isClosed || scoring) && (
        <>
          <FindingSynthesis assessments={assessments} />
          <CARTracking missionId={mission.id} />
          <AuditConclusion
            missionId={mission.id}
            initialConclusion={(mission as unknown as Record<string, unknown>).audit_conclusion as string | null ?? null}
            initialComment={(mission as unknown as Record<string, unknown>).audit_conclusion_comment as string | null ?? null}
          />
          {!reportFlag.loading && reportFlag.enabled && userRole.isPrivileged && (
            <ReportGenerator missionId={mission.id} missionName={mission.name} />
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }){
  return (
    <div className={`rounded-xl border p-5 text-center ${bg}`}>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function ScoringLoader({ missionId }: { missionId: string }){
  const [scoring, setScoring] = useState<ScoringData | null>(null)

  useEffect(() => {
    supabase.functions.invoke('close-mission', { body: { mission_id: missionId } })
      .then(({ data }) => { if (data?.scoring) setScoring(data.scoring as ScoringData) })
  }, [missionId])

  if (!scoring) return <p className="text-sm text-gray-400 text-center py-8">Chargement du scoring...</p>

  return (
    <>
      <HeroScoreCard score={scoring.conformity_score} approvedControls={scoring.approved_controls} totalControls={scoring.total_controls} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Conformes" value={scoring.approved_controls} color="text-green-600" bg="bg-green-50 border-green-200" />
        <StatCard label="Non conformes" value={scoring.rejected_controls} color="text-red-600" bg="bg-red-50 border-red-200" />
        <StatCard label="En attente" value={scoring.pending_controls} color="text-gray-500" bg="bg-gray-50 border-gray-200" />
      </div>
      <DomainBreakdownList domainScores={scoring.domain_scores} />
      <ClosureActionCards />
    </>
  )
}
