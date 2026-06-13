import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'
import type { SupportRequest } from '../../types/database.types'

interface Props {
  request: SupportRequest
}

interface Triage {
  category: string
  gravity: string
  cause: string
  action: string
  data_seen?: string
}

const CAT_LABEL: Record<string, string> = {
  bug_code: 'Bug code', probleme_donnee: 'Problème donnée', permission_rls: 'Permission / RLS',
  erreur_utilisateur: 'Erreur utilisateur', infra_externe: 'Infra externe', indetermine: 'Indéterminé',
}

/** Triage IA (Phase 3, data-facing). Visible seulement pour un bug ET si le flag est ON. */
export function SupportTriagePanel({ request }: Props): JSX.Element | null {
  // Gate sur le kill switch GLOBAL (is_globally_enabled), comme run-agent cote serveur
  // — pas useFeatureFlag (plan-aware) : c'est un garde-fou plateforme, pas une feature de plan.
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [triage, setTriage] = useState<Triage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // feature_flags n'est pas typee dans Database -> cast du resultat.
    supabase.from('feature_flags').select('is_globally_enabled').eq('slug', 'support_agent_triage').maybeSingle()
      .then((res) => {
        const row = res.data as { is_globally_enabled: boolean } | null
        if (active) setEnabled(Boolean(row?.is_globally_enabled))
      })
    return () => { active = false }
  }, [])

  if (enabled !== true || request.nature !== 'bug') return null

  const run = async (): Promise<void> => {
    setBusy(true)
    setError(null)
    const res = await invokeEdgeFunction<{ triage: Triage | null }>('run-agent', { request_id: request.id })
    setBusy(false)
    if (!res.ok || !res.data?.triage) { setError(res.error ?? 'Triage indisponible.'); return }
    setTriage(res.data.triage)
  }

  return (
    <div className="mx-4 mb-3 border border-forest-100 bg-forest-50 rounded-xl p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-forest-700 flex items-center gap-1.5">
          <Sparkles size={13} /> Diagnostic de l&apos;agent
        </span>
        {!triage && (
          <button onClick={() => void run()} disabled={busy} className="px-3 py-1.5 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'Analyse…' : 'Lancer le triage'}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      {triage && (
        <div className="mt-3 text-[13px] space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-forest-200 text-forest-700">{CAT_LABEL[triage.category] ?? triage.category}</span>
            <span className="text-xs text-gray-500">Gravit&eacute;&nbsp;: {triage.gravity}</span>
          </div>
          <p><span className="text-gray-400">Cause&nbsp;:</span> {triage.cause}</p>
          <p><span className="text-gray-400">Action&nbsp;:</span> {triage.action}</p>
          {triage.data_seen && <p className="font-mono text-[11px] text-gray-500">{triage.data_seen}</p>}
        </div>
      )}
    </div>
  )
}
