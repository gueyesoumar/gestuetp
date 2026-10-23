import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { useToast } from '../../../hooks/useToast'
import { useFeatureFlag } from '../../../hooks/useFeatureFlag'
import { useMissionUserRole } from '../useMissionUserRole'
import { HeroScoreCard } from './HeroScoreCard'
import { DomainBreakdownList } from './DomainBreakdownList'
import { ClosureActionCards } from './ClosureActionCards'
import { FindingSynthesis } from './FindingSynthesis'
import { AuditConclusion } from './AuditConclusion'
import { loadAuditReportData } from '../../reports/loadAuditReportData'
import type { AuditReportData } from '../../reports/generateAuditReportPDF'
import type { MissionDetail } from '../useMissionDetail'

// Modale d'apercu v2 (react-pdf) chargee a la demande : react-pdf reste hors bundle initial.
const AuditReportV2Modal = lazy(() => import('../../reports/audit-report-v2/AuditReportV2Modal'))
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
  /** Compteurs de conformité (basés sur conformity_level), affichés dans les StatCards. */
  conformes: number
  partiels: number
  non_conformes: number
  non_applicables: number
  domain_scores: DomainScore[]
}

interface MissionClosureTabProps {
  mission: MissionDetail
  onRefetch: () => void
}

export function MissionClosureTab({ mission, onRefetch }: MissionClosureTabProps){
  const toast = useToast()
  const [closing, setClosing] = useState(false)
  const [closeError, setCloseError] = useState<string | null>(null)
  const [scoring, setScoring] = useState<ScoringData | null>(null)
  const [findingClassifications, setFindingClassifications] = useState<string[]>([])
  const [promotableCount, setPromotableCount] = useState(0)
  const [promoting, setPromoting] = useState(false)
  const [promoRefresh, setPromoRefresh] = useState(0)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const isClosed = mission.status === 'closure'
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
        `${baseUrl}/rest/v1/control_assessments?mission_id=eq.${mission.id}&select=id,mission_id,control_id,auditor_id,status,evidence_notes,observations,conformity_level,created_at,updated_at`,
        { headers: { 'apikey': apikey, 'Authorization': `Bearer ${token}` }, signal: controller.signal }
      )
      if (controller.signal.aborted) return
      if (!res.ok) return
      const assess = (await res.json()) as ControlAssessment[]

      // Fetch findings classifications for the synthesis card
      const ids = assess.map((a) => a.id)
      if (ids.length === 0) {
        setFindingClassifications([])
        setPromotableCount(0)
        return
      }
      const { data: findingsRows } = await supabase
        .from('assessment_findings')
        .select('classification, promoted_at')
        .in('assessment_id', ids)
      if (controller.signal.aborted) return
      const rows = (findingsRows ?? []) as { classification: string; promoted_at: string | null }[]
      setFindingClassifications(rows.map((f) => f.classification))
      // Constats promouvables au registre : tout sauf les points forts, non encore promus.
      setPromotableCount(rows.filter((f) => f.classification !== 'strength' && !f.promoted_at).length)
    }
    load().catch(() => { /* abort au démontage : ignoré */ })
    return () => controller.abort()
  }, [mission.id, promoRefresh])

  // Moteur de rapport v2 (react-pdf) derriere un flag (RFC 0021). OFF par defaut
  // -> chemin jsPDF inchange (aucune regression). ON -> apercu in-app (D-REP-3).
  const reportV2 = useFeatureFlag('report_engine_v2')
  const [previewData, setPreviewData] = useState<AuditReportData | null>(null)

  const handleGenerateAuditReport = useCallback(async () => {
    setGeneratingPdf(true)
    try {
      if (reportV2.enabled) {
        // v2 : on ouvre l'apercu ; le telechargement se fait depuis la modale.
        const data = await loadAuditReportData(mission)
        setPreviewData(data)
      } else {
        const [data, { runAuditReportPdfInWorker }] = await Promise.all([
          loadAuditReportData(mission),
          import('../../reports/runAuditReportPdfInWorker'),
        ])
        await runAuditReportPdfInWorker(data)
        toast.success('Rapport PDF généré', { description: mission.name })
      }
    } catch (err) {
      console.error('[audit report]', err)
      toast.error('Génération du rapport impossible', { description: err instanceof Error ? err.message : String(err) })
    } finally {
      setGeneratingPdf(false)
    }
  }, [mission, toast, reportV2.enabled])

  const handleClose = useCallback(async () => {
    setClosing(true)
    setCloseError(null)
    const { data, error: fnError } = await supabase.functions.invoke('close-mission', {
      body: { mission_id: mission.id },
    })
    if (fnError || data?.error) {
      const msg = await readInvokeError(fnError, data, 'Erreur.')
      setCloseError(msg)
      setClosing(false)
      setConfirmClose(false)
      return
    }
    if (data?.scoring) setScoring(data.scoring as ScoringData)
    setClosing(false)
    setConfirmClose(false)
    toast.success('Mission clôturée', { description: mission.name })
    onRefetch()
  }, [mission.id, mission.name, onRefetch, toast])

  const handleBulkPromote = useCallback(async () => {
    setPromoting(true)
    const { data, error } = await supabase.rpc('promote_findings_bulk', { p_mission_id: mission.id })
    setPromoting(false)
    if (error) {
      toast.error('Promotion impossible', error)
      return
    }
    const n = (data as number) ?? 0
    toast.success(n > 0 ? `${n} constat(s) promu(s) au registre de risque` : 'Aucun constat à promouvoir')
    setPromoRefresh((k) => k + 1)
    onRefetch()
  }, [mission.id, toast, onRefetch])

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
          {isClosed ? 'Cette mission est clôturée.' : 'Clôturez la mission pour générer le score.'}
        </p>
      </div>

      {closeError && <ErrorAlert message={closeError} />}

      {!isClosed && !scoring && userRole.isPrivileged && (
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div>
            <p className="text-sm font-medium text-amber-800">Pr&ecirc;t &agrave; cl&ocirc;turer la mission ?</p>
            <p className="text-xs text-amber-600 mt-0.5">Le score sera calculé et la mission passera en statut clôturé.</p>
          </div>
          <button onClick={() => setConfirmClose(true)} disabled={closing}
            className="bg-amber-600 text-white px-5 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {closing ? 'Clôture...' : 'Clôturer la mission'}
          </button>
        </div>
      )}

      {scoring && (
        <>
          <HeroScoreCard score={scoring.conformity_score} conformes={scoring.conformes} totalControls={scoring.total_controls} />
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Conformes" value={scoring.conformes} color="text-green-600" bg="bg-green-50 border-green-200" />
            <StatCard label="Partiels" value={scoring.partiels} color="text-amber-600" bg="bg-amber-50 border-amber-200" />
            <StatCard label="Non conformes" value={scoring.non_conformes} color="text-red-600" bg="bg-red-50 border-red-200" />
            <StatCard label="Non applicables" value={scoring.non_applicables} color="text-gray-500" bg="bg-gray-50 border-gray-200" />
          </div>
          <DomainBreakdownList domainScores={scoring.domain_scores} />
          <ClosureActionCards
            busy={{ pdf: generatingPdf }}
            onGenerateAuditReport={userRole.isPrivileged ? handleGenerateAuditReport : undefined}
          />
        </>
      )}

      {isClosed && !scoring && (
        <ScoringLoader
          missionId={mission.id}
          actionsBusy={{ pdf: generatingPdf }}
          onGenerateAuditReport={userRole.isPrivileged ? handleGenerateAuditReport : undefined}
        />
      )}

      {/* ISO 27001 closure enrichments */}
      {(isClosed || scoring) && (
        <>
          <FindingSynthesis classifications={findingClassifications} />

          {userRole.isPrivileged && (
            <div className="p-4 bg-white border border-gray-200 rounded-xl">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Promotion au registre de risque</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {promotableCount > 0
                      ? `${promotableCount} constat(s) promouvable(s) vers le registre de risque de l'assujetti.`
                      : 'Tous les constats promouvables sont déjà au registre.'}
                  </p>
                </div>
                {promotableCount > 0 && (
                  <button onClick={() => void handleBulkPromote()} disabled={promoting}
                    className="bg-forest-700 text-white px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 transition-colors">
                    {promoting ? 'Promotion...' : `Promouvoir les ${promotableCount} constats`}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Astuce : activez « promotion automatique des constats » dans les critères de risque pour promouvoir automatiquement à la clôture. La promotion au cas par cas reste disponible dans l&apos;onglet Résultats.
              </p>
            </div>
          )}
          <AuditConclusion
            missionId={mission.id}
            initialConclusion={(mission as unknown as Record<string, unknown>).audit_conclusion as string | null ?? null}
            initialComment={(mission as unknown as Record<string, unknown>).audit_conclusion_comment as string | null ?? null}
          />
        </>
      )}

      <ConfirmDialog
        open={confirmClose}
        title="Clôturer la mission"
        variant="danger"
        confirmWord="CLÔTURER"
        confirmLabel="Clôturer la mission"
        busy={closing}
        onConfirm={handleClose}
        onClose={() => setConfirmClose(false)}
        message={
          <>
            Action <strong>irréversible</strong>. Le score de conformité sera calculé et figé, et la
            mission passera en statut «&nbsp;Clôturé&nbsp;». Aucune modification ne sera ensuite possible.
          </>
        }
      />

      {previewData && (
        <Suspense fallback={null}>
          <AuditReportV2Modal data={previewData} onClose={() => setPreviewData(null)} />
        </Suspense>
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

interface ScoringLoaderProps {
  missionId: string
  actionsBusy?: { pdf?: boolean; pptx?: boolean; plan?: boolean; archive?: boolean }
  onGenerateAuditReport?: () => void | Promise<void>
}

function ScoringLoader({ missionId, actionsBusy, onGenerateAuditReport }: ScoringLoaderProps){
  const [scoring, setScoring] = useState<ScoringData | null>(null)

  useEffect(() => {
    supabase.functions.invoke('close-mission', { body: { mission_id: missionId } })
      .then(async ({ data, error }) => {
        if (error || data?.error) {
          console.error('close-mission (scoring):', await readInvokeError(error, data, 'Chargement du score impossible'))
          return
        }
        if (data?.scoring) setScoring(data.scoring as ScoringData)
      })
  }, [missionId])

  if (!scoring) return <p className="text-sm text-gray-400 text-center py-8">Chargement du score...</p>

  return (
    <>
      <HeroScoreCard score={scoring.conformity_score} conformes={scoring.conformes} totalControls={scoring.total_controls} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Conformes" value={scoring.conformes} color="text-green-600" bg="bg-green-50 border-green-200" />
        <StatCard label="Partiels" value={scoring.partiels} color="text-amber-600" bg="bg-amber-50 border-amber-200" />
        <StatCard label="Non conformes" value={scoring.non_conformes} color="text-red-600" bg="bg-red-50 border-red-200" />
        <StatCard label="Non applicables" value={scoring.non_applicables} color="text-gray-500" bg="bg-gray-50 border-gray-200" />
      </div>
      <DomainBreakdownList domainScores={scoring.domain_scores} />
      <ClosureActionCards busy={actionsBusy} onGenerateAuditReport={onGenerateAuditReport} />
    </>
  )
}
