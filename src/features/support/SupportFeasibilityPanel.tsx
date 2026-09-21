import { useState, useEffect, useCallback } from 'react'
import { FlaskConical, RefreshCw, Layers } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'
import { FeasibilityReportView, type FeasibilityReport } from './FeasibilityReport'
import { ImpactReportView, type ImpactReport } from './ImpactReport'
import type { SupportRequest } from '../../types/database.types'

interface Props {
  request: SupportRequest
}

interface RunRow {
  id: string
  status: 'queued' | 'running' | 'done' | 'error'
  result: FeasibilityReport | { _error?: string } | null
}

interface ImpactRunRow {
  id: string
  status: 'queued' | 'running' | 'done' | 'error'
  result: ImpactReport | { _error?: string } | null
}

/**
 * Faisabilite IA (Phase 4) + Analyse d'impact specialisee (Phase 5a, RFC 0010),
 * code-facing. Visible pour une suggestion. La faisabilite est gardee par le flag
 * support_agent_feasibility ; l'impact par support_agent_impact (garde-fous DPA).
 * L'impact se declenche apres un verdict go/a_etudier et se chaine au run de
 * faisabilite (parent_run_id). Analyses asynchrones (refresh manuel).
 */
export function SupportFeasibilityPanel({ request }: Props): JSX.Element | null {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [run, setRun] = useState<RunRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [impactEnabled, setImpactEnabled] = useState<boolean>(false)
  const [impactRun, setImpactRun] = useState<ImpactRunRow | null>(null)
  const [impactBusy, setImpactBusy] = useState(false)
  const [impactError, setImpactError] = useState<string | null>(null)

  const loadRun = useCallback(async (): Promise<void> => {
    // agent_runs n'est pas typee dans Database -> cast du resultat.
    const res = await supabase.from('agent_runs').select('id, status, result')
      .eq('request_id', request.id).eq('kind', 'feasibility')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    setRun((res.data as RunRow | null) ?? null)
  }, [request.id])

  const loadImpactRun = useCallback(async (): Promise<void> => {
    const res = await supabase.from('agent_runs').select('id, status, result')
      .eq('request_id', request.id).eq('kind', 'impact')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    setImpactRun((res.data as ImpactRunRow | null) ?? null)
  }, [request.id])

  useEffect(() => {
    let active = true
    supabase.from('feature_flags').select('slug, is_globally_enabled')
      .in('slug', ['support_agent_feasibility', 'support_agent_impact'])
      .then((res) => {
        if (!active) return
        const rows = (res.data as Array<{ slug: string; is_globally_enabled: boolean }> | null) ?? []
        setEnabled(rows.some((r) => r.slug === 'support_agent_feasibility' && r.is_globally_enabled))
        setImpactEnabled(rows.some((r) => r.slug === 'support_agent_impact' && r.is_globally_enabled))
      })
    void loadRun()
    void loadImpactRun()
    return () => { active = false }
  }, [loadRun, loadImpactRun])

  if (enabled !== true || request.nature !== 'suggestion') return null

  const launch = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    const res = await invokeEdgeFunction('dispatch-feasibility', { request_id: request.id })
    setBusy(false)
    if (!res.ok) { setError(res.error ?? 'Declenchement impossible.'); return }
    await loadRun()
  }

  const launchImpact = async (): Promise<void> => {
    if (!run) return
    setImpactBusy(true)
    setImpactError(null)
    const res = await invokeEdgeFunction('dispatch-impact', { request_id: request.id, parent_run_id: run.id })
    setImpactBusy(false)
    if (!res.ok) { setImpactError(res.error ?? 'Declenchement impossible.'); return }
    await loadImpactRun()
  }

  const report = run?.status === 'done' && run.result && !('_error' in run.result) ? (run.result as FeasibilityReport) : null
  const running = run?.status === 'running' || run?.status === 'queued'

  const impactReport = impactRun?.status === 'done' && impactRun.result && !('_error' in impactRun.result) ? (impactRun.result as ImpactReport) : null
  const impactRunning = impactRun?.status === 'running' || impactRun?.status === 'queued'
  // L'analyse d'impact ne s'ouvre qu'apres un verdict exploitable (go / a_etudier).
  const impactAvailable = impactEnabled && !!report && report.verdict !== 'no_go'

  return (
    <div className="mx-4 mb-3 border border-forest-100 bg-forest-50 rounded-xl p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-forest-700 flex items-center gap-1.5">
          <FlaskConical size={13} /> Faisabilit&eacute; (agent)
        </span>
        {running ? (
          <button onClick={() => void loadRun()} className="px-3 py-1.5 border border-forest-200 text-forest-700 rounded-lg text-xs font-semibold hover:bg-white flex items-center gap-1.5">
            <RefreshCw size={12} /> Rafra&icirc;chir
          </button>
        ) : (
          <button onClick={() => void launch()} disabled={busy} className="px-3 py-1.5 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'Lancement…' : report ? 'Relancer' : 'Analyser la faisabilité'}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      {running && <p className="text-xs text-gray-500 mt-2">Analyse en cours (GitHub Actions)&hellip; rafra&icirc;chissez dans une minute.</p>}
      {run?.status === 'error' && <p className="text-xs text-red-500 mt-2">L&apos;analyse a &eacute;chou&eacute;. Vous pouvez la relancer.</p>}
      {report && <FeasibilityReportView report={report} />}

      {impactAvailable && (
        <div className="mt-3 pt-3 border-t border-forest-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide text-forest-700 flex items-center gap-1.5">
              <Layers size={13} /> Analyse d&apos;impact (agents)
            </span>
            {impactRunning ? (
              <button onClick={() => void loadImpactRun()} className="px-3 py-1.5 border border-forest-200 text-forest-700 rounded-lg text-xs font-semibold hover:bg-white flex items-center gap-1.5">
                <RefreshCw size={12} /> Rafra&icirc;chir
              </button>
            ) : (
              <button onClick={() => void launchImpact()} disabled={impactBusy} className="px-3 py-1.5 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 disabled:opacity-50">
                {impactBusy ? 'Lancement…' : impactReport ? 'Relancer' : 'Analyser l’impact'}
              </button>
            )}
          </div>

          {impactError && <p className="text-xs text-red-500 mt-2">{impactError}</p>}
          {impactRunning && <p className="text-xs text-gray-500 mt-2">Analyse d&apos;impact en cours (map-reduce)&hellip; rafra&icirc;chissez dans une minute.</p>}
          {impactRun?.status === 'error' && <p className="text-xs text-red-500 mt-2">L&apos;analyse d&apos;impact a &eacute;chou&eacute;. Vous pouvez la relancer.</p>}
          {impactReport && <ImpactReportView report={impactReport} />}
        </div>
      )}
    </div>
  )
}
