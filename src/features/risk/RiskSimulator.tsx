import { useMemo, useState } from 'react'
import { Sparkles, Plus } from 'lucide-react'
import { RISK_TREATMENT_LEVERS, riskExposure } from '../../lib/constants'
import { useToast } from '../../hooks/useToast'
import { useRiskTreatmentActions } from './useRiskTreatment'
import type { ScenarioRow } from './useRiskRegister'

const expColor = (v: number): string => v >= 60 ? '#C0392B' : v >= 30 ? '#B8860B' : '#27AE60'

/**
 * Simulateur « et si » (RFC 0017 Lot D) : ancré sur un scénario, on coche des
 * leviers de traitement concrets et on voit l'exposition projetée face au seuil
 * d'acceptation, puis on les ajoute au plan. Projection indicative (100% client).
 */
export function RiskSimulator({ scenarios, threshold }: { scenarios: ScenarioRow[]; threshold: number }): JSX.Element {
  const toast = useToast()
  const sorted = useMemo(() => [...scenarios].sort((a, b) => b.exposure - a.exposure), [scenarios])
  const [id, setId] = useState<string>(() => sorted[0]?.id ?? '')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const scenario = sorted.find((s) => s.id === id) ?? sorted[0]
  const { createAction } = useRiskTreatmentActions(scenario?.id ?? null)

  if (!scenario) {
    return (
      <div className="rounded-xl border border-[#E07A5F]/30 bg-white p-5">
        <div className="flex items-center gap-2 mb-1"><Sparkles size={16} className="text-[#E07A5F]" /><h3 className="text-sm font-bold text-gray-900">Simulateur « et si »</h3></div>
        <p className="text-[13px] text-gray-400 py-6 text-center">Ajoutez des scénarios cotés pour activer le simulateur.</p>
      </div>
    )
  }

  const toggle = (lid: string): void => setChecked((prev) => { const n = new Set(prev); n.has(lid) ? n.delete(lid) : n.add(lid); return n })
  const dL = RISK_TREATMENT_LEVERS.filter((l) => checked.has(l.id) && l.axis === 'likelihood').length
  const dI = RISK_TREATMENT_LEVERS.filter((l) => checked.has(l.id) && l.axis === 'impact').length
  const projL = Math.max(1, scenario.inherent_likelihood - dL)
  const projI = Math.max(1, scenario.inherent_impact - dI)
  const projExp = riskExposure(projL, projI)
  const underThreshold = projExp <= threshold

  const addToPlan = async (): Promise<void> => {
    const levers = RISK_TREATMENT_LEVERS.filter((l) => checked.has(l.id))
    if (levers.length === 0) return
    setBusy(true)
    const results = await Promise.all(levers.map((l) => createAction({ description: l.label, option: l.option })))
    setBusy(false)
    if (results.every(Boolean)) { toast.success(`${levers.length} action(s) ajoutée(s) au plan`); setChecked(new Set()) }
    else toast.error('Ajout au plan partiel ou impossible')
  }

  return (
    <div className="rounded-xl border border-[#E07A5F]/30 bg-white p-5" style={{ backgroundImage: 'radial-gradient(360px 160px at 90% -20%, rgba(224,122,95,.10), transparent 60%)' }}>
      <div className="flex items-center gap-2 mb-1"><Sparkles size={16} className="text-[#E07A5F]" /><h3 className="text-sm font-bold text-gray-900">Simulateur « et si »</h3></div>
      <p className="text-[11px] text-gray-400 mb-4">Cochez des actions de traitement et visualisez l&apos;exposition projetée face au seuil. Projection indicative.</p>

      <label className="block text-[12px] font-medium text-gray-600 mb-1">Scénario</label>
      <select value={scenario.id} onChange={(e) => { setId(e.target.value); setChecked(new Set()) }} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700 mb-4">
        {sorted.map((s) => <option key={s.id} value={s.id}>{s.title} (expo {s.exposure})</option>)}
      </select>

      {/* Avant -> après vs seuil */}
      <div className="rounded-lg bg-gray-50 p-3 mb-4">
        <div className="flex items-center justify-between text-[12px] mb-2">
          <span className="text-gray-500">Exposition</span>
          <span className="font-mono">
            <b style={{ color: expColor(scenario.exposure) }}>{scenario.exposure}</b>
            <span className="text-gray-300"> &rarr; </span>
            <b style={{ color: expColor(projExp) }}>{projExp}</b>
            <span className="text-gray-400"> (seuil {threshold})</span>
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${projExp}%`, background: underThreshold ? '#27AE60' : 'linear-gradient(90deg,#B34A31,#E07A5F)', transition: 'width .15s ease' }} />
          <div className="absolute top-0 bottom-0 w-[2px] bg-gray-800/70" style={{ left: `${threshold}%` }} title={`Seuil d'acceptation ${threshold}`} />
        </div>
        <p className="text-[11.5px] mt-2" style={{ color: underThreshold ? '#1B7A43' : '#B34A31' }}>
          {underThreshold ? 'Exposition projetée sous le seuil d\'acceptation.' : 'Exposition projetée encore au-dessus du seuil.'}
        </p>
      </div>

      {/* Leviers concrets */}
      <div className="space-y-1.5 mb-4">
        {RISK_TREATMENT_LEVERS.map((l) => (
          <label key={l.id} className="flex items-center gap-2.5 rounded-lg border border-gray-200 px-3 py-2 text-[13px] cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={checked.has(l.id)} onChange={() => toggle(l.id)} className="accent-[#E07A5F]" />
            <span className="flex-1 text-gray-700">{l.label}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">{l.axis === 'likelihood' ? '↓ vraisemblance' : '↓ impact'}</span>
          </label>
        ))}
      </div>

      <button onClick={() => void addToPlan()} disabled={busy || checked.size === 0}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
        <Plus size={16} /> {busy ? 'Ajout...' : `Ajouter au plan${checked.size > 0 ? ` (${checked.size})` : ''}`}
      </button>
    </div>
  )
}
