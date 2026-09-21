import { useState, useEffect, useCallback } from 'react'
import { GitPullRequest, RefreshCw, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'

interface DraftRunRow {
  id: string
  status: 'queued' | 'running' | 'done' | 'error'
  pr_url: string | null
  pr_state: string | null
}

interface Props {
  requestId: string
  impactRunId: string
  /** Éligibilité (miroir du garde serveur) : go + S/M + aucune couche à fort enjeu + aucun bloquant. */
  eligible: boolean
}

/**
 * Section « Brouillon de PR » (RFC 0010, Phase 5b). Owner-only (rendue dans la
 * console super-admin). Le déclenchement est re-vérifié côté edge dispatch-draft-pr.
 */
export function DraftPrSection({ requestId, impactRunId, eligible }: Props): JSX.Element {
  const [run, setRun] = useState<DraftRunRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    const res = await supabase.from('agent_runs').select('id, status, pr_url, pr_state')
      .eq('request_id', requestId).eq('kind', 'draft_pr')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    setRun((res.data as DraftRunRow | null) ?? null)
  }, [requestId])

  useEffect(() => { void load() }, [load])

  const launch = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    const res = await invokeEdgeFunction('dispatch-draft-pr', { request_id: requestId, impact_run_id: impactRunId })
    setBusy(false)
    if (!res.ok) { setError(res.error ?? 'Declenchement impossible.'); return }
    await load()
  }

  const running = run?.status === 'running' || run?.status === 'queued'
  const done = run?.status === 'done' && run.pr_url

  return (
    <div className="mt-3 pt-3 border-t border-forest-100">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-forest-700 flex items-center gap-1.5">
          <GitPullRequest size={13} /> Brouillon de PR (agent)
        </span>
        {running ? (
          <button onClick={() => void load()} className="px-3 py-1.5 border border-forest-200 text-forest-700 rounded-lg text-xs font-semibold hover:bg-white flex items-center gap-1.5">
            <RefreshCw size={12} /> Rafra&icirc;chir
          </button>
        ) : eligible ? (
          <button onClick={() => void launch()} disabled={busy} className="px-3 py-1.5 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'Lancement…' : done ? 'Régénérer' : 'Générer un brouillon'}
          </button>
        ) : null}
      </div>

      {!eligible && <p className="text-xs text-gray-500 mt-2">Non &eacute;ligible au brouillon automatique (migration / edge / bloquant, ou effort &gt; M). &Agrave; traiter manuellement.</p>}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      {running && <p className="text-xs text-gray-500 mt-2">G&eacute;n&eacute;ration en cours (GitHub Actions)&hellip; rafra&icirc;chissez dans une minute.</p>}
      {run?.status === 'error' && <p className="text-xs text-red-500 mt-2">La g&eacute;n&eacute;ration a &eacute;chou&eacute;. Vous pouvez la relancer.</p>}
      {done && (
        <a href={run.pr_url ?? '#'} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:text-forest-900">
          <ExternalLink size={12} /> Voir le brouillon de PR
          {run.pr_state && <span className="ml-1 font-mono text-[10.5px] bg-forest-100 text-forest-700 rounded px-1.5 py-0.5">{run.pr_state}</span>}
        </a>
      )}
    </div>
  )
}
