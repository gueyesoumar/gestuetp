import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useRiskRegister } from './useRiskRegister'
import { useRiskCriteria } from './useRiskCriteria'
import { useScenarioControls } from './useScenarioControls'
import { useScenarioPolicies } from '../policy/useScenarioPolicies'
import { useScenarioIncidents } from './useScenarioIncidents'
import { useRiskTreatmentActions } from './useRiskTreatment'
import { useEdition } from '../edition/EditionContext'
import { useVocab } from '../edition/useVocab'
import { SimulatorPanel, type BarrierLike } from './SimulatorPanel'
import { SupervisedSimulator } from './SupervisedSimulator'
import { type RiskControlLinkKind } from '../../lib/constants'
import { useToast } from '../../hooks/useToast'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'

/** Simulateur « et si » : own-org (barrières réelles + plan) ou assujetti supervisé (#7). */
export function RiskSimulatorPage(): JSX.Element {
  const { hasCapability } = useEdition()
  const vocab = useVocab()
  const supervises = hasCapability('supervision') || hasCapability('client_portal')
  const [scope, setScope] = useState<'own' | 'all'>('own')
  const consolidated = supervises && scope === 'all'
  const reg = useRiskRegister()
  const crit = useRiskCriteria()
  const toast = useToast()
  const [selected, setSelected] = useState('')

  const sel = selected || reg.scenarios[0]?.id || ''
  const scenario = reg.scenarios.find((s) => s.id === sel) ?? null
  const ctrl = useScenarioControls(sel)
  const inc = useScenarioIncidents(sel, scenario?.dimension ?? null)
  const pol = useScenarioPolicies(sel)
  const { createAction } = useRiskTreatmentActions(sel)

  const base = useMemo<BarrierLike[]>(() => [
    ...ctrl.barriers.map((b) => ({ kind: b.kind as RiskControlLinkKind, effectiveness: b.assessed ? b.effectiveness : 0, label: b.code })),
    ...pol.barriers.map((b) => ({ kind: b.kind as RiskControlLinkKind, effectiveness: b.effectiveness, label: b.title })),
  ], [ctrl.barriers, pol.barriers])

  const commit = async (labels: string[]): Promise<boolean> => {
    const res = await Promise.all(labels.map((l) => createAction({ description: l, option: 'reduce' })))
    const ok = res.every(Boolean)
    if (ok) toast.success(`${labels.length} action(s) ajoutée(s) au plan`)
    else toast.error('Ajout au plan partiel ou impossible')
    return ok
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Sparkles size={20} className="text-[#E07A5F]" /> Simulateur « et si »</h1>
        <p className="mt-1 text-[13px] text-gray-500">{consolidated
          ? `Simulez des mesures sur un risque de vos ${vocab.entityPlural} : le résiduel se recalcule, puis demandez les actions retenues.`
          : "Cochez des actions concrètes sur un risque : le résiduel et sa position face au seuil se recalculent en direct. Aucune écriture tant que vous n'ajoutez pas au plan."}</p>
      </div>

      {supervises && (
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-[13px] font-semibold">
          <button onClick={() => setScope('own')} className={`px-3 py-1.5 ${!consolidated ? 'bg-forest-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Mon organisation</button>
          <button onClick={() => setScope('all')} className={`px-3 py-1.5 border-l border-gray-200 ${consolidated ? 'bg-forest-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Tous les {vocab.entityPlural}</button>
        </div>
      )}

      {consolidated ? (
        <SupervisedSimulator />
      ) : reg.loading ? <LoadingSpinner /> : reg.error ? <ErrorAlert message={reg.error} /> : reg.scenarios.length === 0 ? (
        <EmptyState title="Aucun scénario" description="Ajoutez un scénario coté au registre pour activer le simulateur." />
      ) : (
        <>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Risque simulé</label>
            <select value={sel} onChange={(e) => setSelected(e.target.value)} className="w-full max-w-xl px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700">
              {reg.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          {scenario && <SimulatorPanel scenario={scenario} base={base} bump={inc.bump} threshold={crit.acceptanceThreshold} commitLabel="Ajouter au plan" busyLabel="Ajout..." onCommit={commit} />}
        </>
      )}
    </div>
  )
}
