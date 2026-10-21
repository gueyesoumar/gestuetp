import { useEffect, useState } from 'react'
import { SlidersHorizontal, Save, Lock, Calculator } from 'lucide-react'
import { useRiskCriteria } from './useRiskCriteria'
import { useCabinetPermissions } from '../../hooks/useCabinetPermissions'
import { useToast } from '../../hooks/useToast'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { RISK_LIKELIHOOD_LEVELS, RISK_IMPACT_LEVELS, REVIEW_CADENCE_OPTIONS } from '../../lib/constants'

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
  const [autoPromote, setAutoPromote] = useState(false)
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
    setAutoPromote(crit.autoPromoteFindings)
    setLLabels(crit.likelihoodLabels ?? DEF_L)
    setILabels(crit.impactLabels ?? DEF_I)
    setReady(true)
  }, [crit.loading, ready, crit.acceptanceThreshold, crit.appetiteStatement, crit.reviewDefaultMonths, crit.likelihoodLabels, crit.impactLabels, crit.autoPromoteFindings])

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
      auto_promote_findings: autoPromote,
    })
    setSaving(false)
    if (ok) toast.success('Critères enregistrés')
    else toast.error('Enregistrement impossible')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><SlidersHorizontal size={20} className="text-[#E07A5F]" /> Critères &amp; contexte</h1>
          <p className="mt-1 text-[13px] text-gray-500">Établissement du contexte (ISO 27005). Matrice 4×4 figée ; seuil, libellés et cadence configurables.</p>
        </div>
        {!ro && <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"><Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}</button>}
      </div>

      {ro && <div className="flex items-center gap-2 text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"><Lock size={14} /> Lecture seule : la permission <span className="font-mono">can_manage_risk_criteria</span> est requise pour modifier les critères.</div>}
      {!crit.customized && <p className="text-[12px] text-gray-400">Valeurs par défaut de la plateforme (aucune personnalisation enregistrée pour cette organisation).</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-start">
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

        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4 md:col-span-2 lg:col-span-1">
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
            <select disabled={ro} value={cadence} onChange={(e) => setCadence(Number(e.target.value))} className={`${inputCls} w-48`}>
              {REVIEW_CADENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" disabled={ro} checked={autoPromote} onChange={(e) => setAutoPromote(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-forest-600 focus:ring-forest-500" />
              <span>
                <span className="block text-sm font-semibold text-gray-900">Promotion automatique des constats</span>
                <span className="block text-[12px] text-gray-500">À la clôture d&rsquo;un contrôle, les constats (NC majeures et mineures) deviennent automatiquement des scénarios « analysés » dans ce registre.</span>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2"><Calculator size={16} className="text-[#E07A5F]" /> Comment l&rsquo;exposition est calculée</h2>
        <p className="text-[13px] text-gray-600">
          Chaque scénario est coté sur deux axes de 1 à 4 : la <b>vraisemblance (V)</b> et l&rsquo;<b>impact (I)</b>.
          L&rsquo;exposition est un indice sur 100, normalisé par rapport au maximum de la matrice (4×4 = 16) :
        </p>
        <p className="my-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 font-mono text-[13px] text-gray-900">
          exposition = V × I / 16 × 100
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[12px] font-semibold text-gray-700 mb-1">Bandes de lecture</p>
            <ul className="space-y-1 text-[12px] text-gray-600">
              <li><span className="font-bold text-[#C0392B]">≥ 60</span> critique</li>
              <li><span className="font-bold text-[#B8860B]">30 à 59</span> à surveiller</li>
              <li><span className="font-bold text-[#27AE60]">&lt; 30</span> maîtrisé</li>
            </ul>
          </div>
          <div>
            <p className="text-[12px] font-semibold text-gray-700 mb-1">Exemples</p>
            <ul className="space-y-1 text-[12px] text-gray-600 font-mono">
              <li>V=2 · I=2 &rarr; 4/16 × 100 = <b>25</b> (maîtrisé)</li>
              <li>V=3 · I=4 &rarr; 12/16 × 100 = <b>75</b> (critique)</li>
              <li>V=4 · I=4 &rarr; 16/16 × 100 = <b>100</b> (critique)</li>
            </ul>
          </div>
        </div>
        <p className="mt-3 text-[12px] text-gray-500">
          Au-dessus du <b>seuil d&rsquo;acceptation</b> (actuellement <b>{threshold}</b>), un traitement est obligatoire
          avant toute acceptation : le scénario est marqué « hors seuil ». L&rsquo;exposition <b>résiduelle</b> applique
          en plus l&rsquo;effet des barrières (préventives sur V, correctives sur I).
        </p>
      </div>
    </div>
  )
}
