import { useState, useEffect, useCallback } from 'react'
import { FlaskConical, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'
import { FeasibilityReportView, type FeasibilityReport } from './FeasibilityReport'
import type { SupportRequest } from '../../types/database.types'

interface Props {
  request: SupportRequest
}

interface RunRow {
  id: string
  status: 'queued' | 'running' | 'done' | 'error'
  result: FeasibilityReport | { _error?: string } | null
}

/**
 * Faisabilite IA (Phase 4, code-facing). Visible pour une suggestion ET si le flag
 * support_agent_feasibility est ON (garde-fou DPA, comme le serveur). Declenche
 * GitHub Actions via dispatch-feasibility ; l'analyse est asynchrone (refresh manuel).
 */
export function SupportFeasibilityPanel({ request }: Props): JSX.Element | null {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [run, setRun] = useState<RunRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRun = useCallback(async (): Promise<void> => {
    // agent_runs n'est pas typee dans Database -> cast du resultat.
    const res = await supabase.from('agent_runs').select('id, status, result')
      .eq('request_id', request.id).eq('kind', 'feasibility')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    setRun((res.data as RunRow | null) ?? null)
  }, [request.id])

  useEffect(() => {
    let active = true
    supabase.from('feature_flags').select('is_globally_enabled').eq('slug', 'support_agent_feasibility').maybeSingle()
      .then((res) => {
        const row = res.data as { is_globally_enabled: boolean } | null
        if (active) setEnabled(Boolean(row?.is_globally_enabled))
      })
    void loadRun()
    return () => { active = false }
  }, [loadRun])

  if (enabled !== true || request.nature !== 'suggestion') return null

  const launch = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    const res = await invokeEdgeFunction('dispatch-feasibility', { request_id: request.id })
    setBusy(false)
    if (!res.ok) { setError(res.error ?? 'Declenchement impossible.'); return }
    await loadRun()
  }

  const report = run?.status === 'done' && run.result && !('_error' in run.result) ? (run.result as FeasibilityReport) : null
  const running = run?.status === 'running' || run?.status === 'queued'

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
    </div>
  )
}
