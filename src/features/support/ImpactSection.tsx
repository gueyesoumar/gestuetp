import { useState, useEffect, useCallback } from 'react'
import { Layers, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'
import { ImpactReportView, type ImpactReport } from './ImpactReport'
import { DraftPrSection } from './DraftPrSection'
import type { FeasibilityReport } from './FeasibilityReport'

interface RunRow {
  id: string
  status: 'queued' | 'running' | 'done' | 'error'
  result: ImpactReport | { _error?: string } | null
}

interface Props {
  requestId: string
  /** Run de faisabilité parent (chaînage + éligibilité effort). */
  feasibilityRunId: string
  feasibilityReport: FeasibilityReport
}

/**
 * Analyse d'impact (Phase 5a) + brouillon de PR (Phase 5b), en aval d'une
 * faisabilité go/à-étudier. Owner-only. Chaque étage est gardé par son flag DPA.
 */
export function ImpactSection({ requestId, feasibilityRunId, feasibilityReport }: Props): JSX.Element | null {
  const [impactEnabled, setImpactEnabled] = useState<boolean>(false)
  const [draftEnabled, setDraftEnabled] = useState<boolean>(false)
  const [run, setRun] = useState<RunRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    const res = await supabase.from('agent_runs').select('id, status, result')
      .eq('request_id', requestId).eq('kind', 'impact')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    setRun((res.data as RunRow | null) ?? null)
  }, [requestId])

  useEffect(() => {
    let active = true
    supabase.from('feature_flags').select('slug, is_globally_enabled')
      .in('slug', ['support_agent_impact', 'support_agent_draft_pr'])
      .then((res) => {
        if (!active) return
        const rows = (res.data as Array<{ slug: string; is_globally_enabled: boolean }> | null) ?? []
        setImpactEnabled(rows.some((r) => r.slug === 'support_agent_impact' && r.is_globally_enabled))
        setDraftEnabled(rows.some((r) => r.slug === 'support_agent_draft_pr' && r.is_globally_enabled))
      })
    void load()
    return () => { active = false }
  }, [load])

  if (!impactEnabled) return null

  const launch = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    const res = await invokeEdgeFunction('dispatch-impact', { request_id: requestId, parent_run_id: feasibilityRunId })
    setBusy(false)
    if (!res.ok) { setError(res.error ?? 'Declenchement impossible.'); return }
    await load()
  }

  const report = run?.status === 'done' && run.result && !('_error' in run.result) ? (run.result as ImpactReport) : null
  const running = run?.status === 'running' || run?.status === 'queued'

  // Éligibilité brouillon (miroir du garde serveur, déc. C) + raisons de non-recommandation.
  // L'owner peut forcer sauf bloquant sécurité/RLS (déc. C amendée).
  const draftReasons: string[] = []
  if (report) {
    if (report.verdict !== 'go') draftReasons.push('verdict non « go »')
    if (!['S', 'M'].includes(feasibilityReport.effort_estimate)) draftReasons.push('effort > M')
    if (report.migrations?.needed === true) draftReasons.push('migration requise')
    if (Array.isArray(report.backend?.edges) && report.backend.edges.length > 0) draftReasons.push('modifie un edge')
    if (report.rls_impact?.verdict === 'bloquant') draftReasons.push('bloquant RLS')
    if (report.securite?.verdict === 'bloquant') draftReasons.push('bloquant sécurité')
  }
  const draftHardBlock = !!report && (report.rls_impact?.verdict === 'bloquant' || report.securite?.verdict === 'bloquant')
  const draftEligible = draftEnabled && !!report && draftReasons.length === 0

  return (
    <div className="mt-3 pt-3 border-t border-forest-100">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-forest-700 flex items-center gap-1.5">
          <Layers size={13} /> Analyse d&apos;impact (agents)
        </span>
        {running ? (
          <button onClick={() => void load()} className="px-3 py-1.5 border border-forest-200 text-forest-700 rounded-lg text-xs font-semibold hover:bg-white flex items-center gap-1.5">
            <RefreshCw size={12} /> Rafra&icirc;chir
          </button>
        ) : (
          <button onClick={() => void launch()} disabled={busy} className="px-3 py-1.5 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'Lancement…' : report ? 'Relancer' : 'Analyser l’impact'}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      {running && <p className="text-xs text-gray-500 mt-2">Analyse d&apos;impact en cours (map-reduce)&hellip; rafra&icirc;chissez dans une minute.</p>}
      {run?.status === 'error' && <p className="text-xs text-red-500 mt-2">L&apos;analyse d&apos;impact a &eacute;chou&eacute;. Vous pouvez la relancer.</p>}
      {report && <ImpactReportView report={report} />}

      {report && run && draftEnabled && (
        <DraftPrSection requestId={requestId} impactRunId={run.id} eligible={draftEligible} reasons={draftReasons} hardBlock={draftHardBlock} />
      )}
    </div>
  )
}
