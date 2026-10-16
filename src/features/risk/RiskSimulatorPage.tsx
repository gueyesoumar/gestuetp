import { useMemo, useState } from 'react'
import { Sparkles, Plus } from 'lucide-react'
import { useRiskRegister } from './useRiskRegister'
import { useRiskCriteria } from './useRiskCriteria'
import { useScenarioControls } from './useScenarioControls'
import { useScenarioPolicies } from '../policy/useScenarioPolicies'
import { useScenarioIncidents } from './useScenarioIncidents'
import { useRiskTreatmentActions } from './useRiskTreatment'
import { computeBowtieModel } from './scenarioBowtieModel'
import { barrierSide, type RiskControlLinkKind } from '../../lib/constants'
import { useToast } from '../../hooks/useToast'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'
import { expColor } from './riskLabels'

type BarrierLike = { kind: RiskControlLinkKind; effectiveness: number; label: string }
type Lever = { id: string; label: string; kind: RiskControlLinkKind; apply: (arr: BarrierLike[]) => BarrierLike[] }

const typeLabel = (k: RiskControlLinkKind): string => k === 'detective' ? 'Détectif' : barrierSide(k) === 'likelihood' ? 'Préventif' : 'Correctif'
const TARGET = 0.75, NEW_EFF = 0.7

/** Simulateur « et si » fidèle (RFC 0017 G1) : ancré sur un scénario, leviers = ses
 *  barrières candidates, effet chiffré par le vrai modèle, puis ajout au plan. */
export function RiskSimulatorPage(): JSX.Element {
  const reg = useRiskRegister()
  const crit = useRiskCriteria()
  const toast = useToast()
  const [selected, setSelected] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

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

  const levers = useMemo<Lever[]>(() => {
    const out: Lever[] = []
    base.forEach((b, i) => { if (b.effectiveness < 0.5) out.push({
      id: `imp-${i}`, label: `Rendre efficace : ${b.label}`, kind: b.kind,
      apply: (arr) => arr.map((x, idx) => idx === i ? { ...x, effectiveness: Math.max(x.effectiveness, TARGET) } : x),
    }) })
    out.push({ id: 'gen-prev', label: 'Nouvelle barrière préventive (MFA, durcissement...)', kind: 'preventive', apply: (arr) => [...arr, { kind: 'preventive', effectiveness: NEW_EFF, label: '' }] })
    out.push({ id: 'gen-corr', label: 'Nouvelle barrière corrective (sauvegardes, PRA...)', kind: 'corrective', apply: (arr) => [...arr, { kind: 'corrective', effectiveness: NEW_EFF, label: '' }] })
    return out
  }, [base])

  if (reg.loading) return <LoadingSpinner />
  if (reg.error) return <ErrorAlert message={reg.error} />

  const residualOf = (ids: Set<string>): number => {
    if (!scenario) return 0
    let arr = base.map((b) => ({ ...b }))
    levers.forEach((l) => { if (ids.has(l.id)) arr = l.apply(arr) })
    return computeBowtieModel(scenario, arr, [], inc.bump).residual
  }
  const baseResidual = residualOf(new Set())
  const simResidual = residualOf(checked)
  const threshold = crit.acceptanceThreshold
  const under = simResidual <= threshold
  const toggle = (id: string): void => setChecked((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const addToPlan = async (): Promise<void> => {
    const picked = levers.filter((l) => checked.has(l.id))
    if (!picked.length) return
    setBusy(true)
    const res = await Promise.all(picked.map((l) => createAction({ description: l.label, option: 'reduce' })))
    setBusy(false)
    if (res.every(Boolean)) { toast.success(`${picked.length} action(s) ajoutée(s) au plan`); setChecked(new Set()) }
    else toast.error('Ajout au plan partiel ou impossible')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Sparkles size={20} className="text-[#E07A5F]" /> Simulateur « et si »</h1>
        <p className="mt-1 text-[13px] text-gray-500">Cochez des actions concrètes sur un risque : le résiduel et sa position face au seuil se recalculent en direct. Aucune écriture tant que vous n&apos;ajoutez pas au plan.</p>
      </div>

      {reg.scenarios.length === 0 ? (
        <EmptyState title="Aucun scénario" description="Ajoutez un scénario coté au registre pour activer le simulateur." />
      ) : (
        <>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Risque simulé</label>
            <select value={sel} onChange={(e) => { setSelected(e.target.value); setChecked(new Set()) }} className="w-full max-w-xl px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700">
              {reg.scenarios.map((s) => <option key={s.id} value={s.id}>{s.title} (résiduel {residualOf(new Set())})</option>)}
            </select>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] items-start">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-1">Actions à simuler</h3>
              <p className="text-[11px] text-gray-400 mb-3">Barrières candidates issues du nœud papillon du risque.</p>
              {levers.map((l) => {
                const delta = baseResidual - residualOf(new Set([l.id]))
                return (
                  <label key={l.id} className="flex items-start gap-2.5 py-2.5 border-b border-gray-100 last:border-0 cursor-pointer">
                    <input type="checkbox" checked={checked.has(l.id)} onChange={() => toggle(l.id)} className="mt-0.5 accent-[#E07A5F]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-gray-800">{l.label}</div>
                      <div className="text-[11px] text-gray-400">{typeLabel(l.kind)} · {l.kind === 'detective' ? 'accélère la réaction' : barrierSide(l.kind) === 'likelihood' ? '↓ vraisemblance' : '↓ impact'}</div>
                    </div>
                    <span className="font-mono font-bold text-[13px] shrink-0" style={{ color: delta > 0 ? '#1B7A43' : '#94A3B8' }}>{delta > 0 ? `-${delta}` : '0'}</span>
                  </label>
                )
              })}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Effet simulé</h3>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center"><div className="text-[10px] uppercase tracking-wide text-gray-400">Actuel</div><div className="text-3xl font-bold" style={{ color: expColor(baseResidual) }}>{baseResidual}</div></div>
                <span className="text-xl text-gray-300">&rarr;</span>
                <div className="text-center"><div className="text-[10px] uppercase tracking-wide text-gray-400">Simulé</div><div className="text-3xl font-bold" style={{ color: expColor(simResidual) }}>{simResidual}</div></div>
              </div>
              <div className="relative mt-4 h-2.5 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${simResidual}%`, background: under ? '#27AE60' : 'linear-gradient(90deg,#B34A31,#E07A5F)', transition: 'width .15s ease' }} />
                <div className="absolute top-0 bottom-0 w-[2px] bg-gray-800/70" style={{ left: `${threshold}%` }} title={`Seuil ${threshold}`} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-1"><span>0</span><span>seuil {threshold}</span><span>100</span></div>
              <p className="text-[12px] mt-3 text-center" style={{ color: under ? '#1B7A43' : '#B34A31' }}>
                {under ? 'Résiduel projeté sous le seuil d\'acceptation.' : 'Résiduel projeté encore au-dessus du seuil.'}
              </p>
              <button onClick={() => void addToPlan()} disabled={busy || checked.size === 0}
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
                <Plus size={16} /> {busy ? 'Ajout...' : `Ajouter au plan${checked.size > 0 ? ` (${checked.size})` : ''}`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
