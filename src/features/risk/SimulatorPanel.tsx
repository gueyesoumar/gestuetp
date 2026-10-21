import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { computeBowtieModel } from './scenarioBowtieModel'
import { barrierSide, RISK_TREATMENT_LEVERS, type RiskControlLinkKind } from '../../lib/constants'
import { expColor } from './riskLabels'
import type { ScenarioRow } from './useRiskRegister'

export type BarrierLike = { kind: RiskControlLinkKind; effectiveness: number; label: string }
type Lever = { id: string; label: string; kind: RiskControlLinkKind; apply: (arr: BarrierLike[]) => BarrierLike[] }

const typeLabel = (k: RiskControlLinkKind): string => k === 'detective' ? 'Détectif' : barrierSide(k) === 'likelihood' ? 'Préventif' : 'Correctif'
const TARGET = 0.75

interface Props {
  scenario: Pick<ScenarioRow, 'inherent_likelihood' | 'inherent_impact'> & { dimension: string | null }
  base: BarrierLike[]
  bump: number
  threshold: number
  commitLabel: string
  busyLabel: string
  onCommit: (labels: string[]) => Promise<boolean>
}

/** Panneau de simulation partagé (RFC 0017 G1 + #7) : leviers = barrières candidates
 *  du risque + catalogue par dimension ; avant→après vs seuil ; action de validation. */
export function SimulatorPanel({ scenario, base, bump, threshold, commitLabel, busyLabel, onCommit }: Props): JSX.Element {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const levers = useMemo<Lever[]>(() => {
    const out: Lever[] = []
    base.forEach((b, i) => { if (b.effectiveness < 0.5) out.push({
      id: `imp-${i}`, label: `Rendre efficace : ${b.label}`, kind: b.kind,
      apply: (arr) => arr.map((x, idx) => idx === i ? { ...x, effectiveness: Math.max(x.effectiveness, TARGET) } : x),
    }) })
    const cat = RISK_TREATMENT_LEVERS[scenario.dimension ?? '_'] ?? RISK_TREATMENT_LEVERS._
    cat.forEach((lv, i) => out.push({
      id: `cat-${i}`, label: lv.label, kind: lv.kind,
      apply: (arr) => [...arr, { kind: lv.kind, effectiveness: lv.eff, label: lv.label }],
    }))
    return out
  }, [base, scenario.dimension])

  const residualOf = (ids: Set<string>): number => {
    let arr = base.map((b) => ({ ...b }))
    levers.forEach((l) => { if (ids.has(l.id)) arr = l.apply(arr) })
    return computeBowtieModel(scenario, arr, [], bump).residual
  }
  const baseResidual = residualOf(new Set())
  const simResidual = residualOf(checked)
  const under = simResidual <= threshold
  const toggle = (id: string): void => setChecked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n })

  const commit = async (): Promise<void> => {
    const picked = levers.filter((l) => checked.has(l.id)).map((l) => l.label)
    if (!picked.length) return
    setBusy(true)
    const ok = await onCommit(picked)
    setBusy(false)
    if (ok) setChecked(new Set())
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] items-start">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Actions à simuler</h3>
        <p className="text-[11px] text-gray-400 mb-3">Barrières candidates issues du nœud papillon du risque.</p>
        {levers.length === 0 && <p className="text-[13px] text-gray-400 py-2">Aucune barrière candidate pour ce risque.</p>}
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
          {under ? "Résiduel projeté sous le seuil d'acceptation." : 'Résiduel projeté encore au-dessus du seuil.'}
        </p>
        <button onClick={() => void commit()} disabled={busy || checked.size === 0}
          className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
          <Plus size={16} /> {busy ? busyLabel : `${commitLabel}${checked.size > 0 ? ` (${checked.size})` : ''}`}
        </button>
      </div>
    </div>
  )
}
