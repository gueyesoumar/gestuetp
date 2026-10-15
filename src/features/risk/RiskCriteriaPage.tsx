import { useEffect, useState } from 'react'
import { SlidersHorizontal, Save, Lock } from 'lucide-react'
import { useRiskCriteria } from './useRiskCriteria'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'
import { useToast } from '../../hooks/useToast'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { RISK_LIKELIHOOD_LEVELS, RISK_IMPACT_LEVELS } from '../../lib/constants'

const DEF_L = RISK_LIKELIHOOD_LEVELS.map((l) => l.label)
const DEF_I = RISK_IMPACT_LEVELS.map((l) => l.label)

/** Critères de risque de l'organisation (ISO 27005, contexte) - RFC 0017 Lot 1. */
export function RiskCriteriaPage(): JSX.Element {
  const crit = useRiskCriteria()
  const { canManageRiskCriteria } = useCabinetPermissions()
  const toast = useToast()

  const [threshold, setThreshold] = useState(60)
  const [appetite, setAppetite] = useState('')
  const [cadence, setCadence] = useState(6)
  const [lLabels, setLLabels] = useState<string[]>(DEF_L)
  const [iLabels, setILabels] = useState<string[]>(DEF_I)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  // Hydrate l'état local une fois les critères chargés (défauts si non personnalisé).
  useEffect(() => {
    if (crit.loading || ready) return
    setThreshold(crit.acceptanceThreshold)
    setAppetite(crit.appetiteStatement ?? '')
    setCadence(crit.reviewDefaultMonths)
    setLLabels(crit.likelihoodLabels ?? DEF_L)
    setILabels(crit.impactLabels ?? DEF_I)
    setReady(true)
  }, [crit.loading, ready, crit.acceptanceThreshold, crit.appetiteStatement, crit.reviewDefaultMonths, crit.likelihoodLabels, crit.impactLabels])

  if (crit.loading || !ready) return <LoadingSpinner />
  if (crit.error) return <ErrorAlert message={crit.error} />

  const ro = !canManageRiskCriteria
  const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400'

  const save = async (): Promise<void> => {
    setSaving(true)
    const ok = await crit.saveCriteria({
      acceptance_threshold: Math.max(0, Math.min(100, threshold)),
      appetite_statement: appetite.trim() || null,
      review_default_months: cadence,
      likelihood_labels: lLabels,
      impact_labels: iLabels,
    })
    setSaving(false)
    if (ok) toast.success('Critères enregistrés')
    else toast.error('Enregistrement impossible')
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><SlidersHorizontal size={20} className="text-[#E07A5F]" /> Critères &amp; contexte</h1>
          <p className="mt-1 text-[13px] text-gray-500">Établissement du contexte (ISO 27005). Matrice 4×4 figée ; seuil, libellés et cadence configurables.</p>
        </div>
        {!ro && <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"><Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}</button>}
      </div>

      {ro && <div className="flex items-center gap-2 text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"><Lock size={14} /> Lecture seule : la permission <span className="font-mono">can_manage_risk_criteria</span> est requise pour modifier les critères.</div>}
      {!crit.customized && <p className="text-[12px] text-gray-400">Valeurs par défaut de la plateforme (aucune personnalisation enregistrée pour cette organisation).</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Échelle de vraisemblance</h2>
          <div className="space-y-2">
            {lLabels.map((lab, i) => (
              <div key={i} className="flex items-center gap-2"><span className="font-mono text-xs text-gray-400 w-4">{i + 1}</span>
                <input disabled={ro} value={lab} onChange={(e) => setLLabels(lLabels.map((x, j) => j === i ? e.target.value : x))} className={`${inputCls} flex-1`} /></div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Échelle d'impact</h2>
          <div className="space-y-2">
            {iLabels.map((lab, i) => (
              <div key={i} className="flex items-center gap-2"><span className="font-mono text-xs text-gray-400 w-4">{i + 1}</span>
                <input disabled={ro} value={lab} onChange={(e) => setILabels(iLabels.map((x, j) => j === i ? e.target.value : x))} className={`${inputCls} flex-1`} /></div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Seuil d'acceptation <span className="font-normal text-gray-400">(exposition 0-100)</span></label>
          <p className="text-[12px] text-gray-500 mb-2">Au-dessus de ce niveau, un traitement est obligatoire avant toute acceptation (drapeau « hors seuil »).</p>
          <input type="number" min={0} max={100} disabled={ro} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className={`${inputCls} w-28`} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Appétit au risque</label>
          <textarea disabled={ro} rows={3} value={appetite} onChange={(e) => setAppetite(e.target.value)} placeholder="Ex. L'organisme ne tolère aucun risque critique non traité sur les données sensibles..." className={`${inputCls} w-full`} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-1">Cadence de revue par défaut</label>
          <select disabled={ro} value={cadence} onChange={(e) => setCadence(Number(e.target.value))} className={`${inputCls} w-40`}>
            <option value={3}>3 mois</option>
            <option value={6}>6 mois</option>
            <option value={12}>12 mois</option>
          </select>
        </div>
      </div>
    </div>
  )
}
