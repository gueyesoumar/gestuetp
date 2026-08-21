import { useState } from 'react'
import { useCabinetFeatureFlags } from '../admin/useCabinetFeatureFlags'
import type { SupportRequest } from '../../types/database.types'

interface Props {
  request: SupportRequest
  onResolved: () => void
}

/**
 * Fulfillment 1-clic depuis un ticket (cote platform owner).
 * - feature_activation : active un flag pour le cabinet du ticket (setOverride).
 * - plan_change : pas d'auto-application depuis le ticket (le changement de plan
 *   se gere dans la console Abonnement, onglet Abonnement) -> note manuelle.
 */
export function SupportFulfillmentPanel({ request, onResolved }: Props): JSX.Element | null {
  if (request.subtype === 'feature_activation') {
    return <FeatureActivation request={request} onResolved={onResolved} />
  }
  if (request.subtype === 'plan_change') {
    return (
      <div className="mx-4 mb-3 border border-amber-200 bg-amber-50 rounded-xl p-3 text-[12px] text-amber-800">
        Changement de plan&nbsp;: &agrave; traiter manuellement (la capacit&eacute; commerciale d&eacute;di&eacute;e n&apos;est pas encore en place), puis marquer r&eacute;solu.
      </div>
    )
  }
  return null
}

function FeatureActivation({ request, onResolved }: Props): JSX.Element {
  const { flags, loading, setOverride } = useCabinetFeatureFlags(request.cabinet_id)
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const candidates = flags.filter((f) => f.is_globally_enabled && f.state !== 'override_on')

  const activate = async (): Promise<void> => {
    if (!slug) return
    setBusy(true)
    setErr(null)
    const ok = await setOverride(slug, true, `Active via demande support #${request.id.slice(0, 8)}`)
    setBusy(false)
    if (!ok) { setErr('Activation impossible pour le moment.'); return }
    onResolved()
  }

  return (
    <div className="mx-4 mb-3 border border-forest-100 bg-forest-50 rounded-xl p-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wide text-forest-700 mb-2">Activer une fonctionnalit&eacute;</p>
      {loading ? (
        <p className="text-xs text-gray-400">Chargement des fonctionnalit&eacute;s&hellip;</p>
      ) : candidates.length === 0 ? (
        <p className="text-xs text-gray-500">Aucune fonctionnalit&eacute; activable pour ce cabinet.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="flex-1 min-w-[180px] border border-gray-200 rounded-lg p-2 text-sm bg-white"
          >
            <option value="">Choisir une fonctionnalit&eacute;&hellip;</option>
            {candidates.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
          <button
            onClick={() => void activate()}
            disabled={!slug || busy}
            className="px-3.5 py-2 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 disabled:opacity-40"
          >
            {busy ? 'Activation…' : 'Activer pour le cabinet'}
          </button>
        </div>
      )}
      {err && <p className="text-xs text-red-500 mt-2">{err}</p>}
    </div>
  )
}
