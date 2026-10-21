import { ExpositionHelp } from './ExpositionHelp'
import { DimChip, ExpoBadge, LifecycleChip, SourceBadge, treatmentLabel } from './riskLabels'
import { DeleteScenarioButton } from './DeleteScenarioButton'
import type { ScenarioRow } from './useRiskRegister'

interface Props {
  rows: ScenarioRow[]
  threshold: number
  isAboveThreshold: (n: number) => boolean
  onOpen: (s: ScenarioRow) => void
  onDelete: (id: string) => void
}

/** Tableau du registre de risque propre à l'organisation (extrait de RiskRegisterPage). */
export function RiskScenarioTable({ rows, threshold, isAboveThreshold, onOpen, onDelete }: Props): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-[13px]">
        <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Scénario</th>
            <th className="text-left px-4 py-3 font-semibold">Dimension</th>
            <th className="text-left px-4 py-3 font-semibold">Cotation</th>
            <th className="text-left px-4 py-3 font-semibold"><span className="inline-flex items-center gap-1">Exposition <ExpositionHelp threshold={threshold} /></span></th>
            <th className="text-left px-4 py-3 font-semibold">Cycle de vie</th>
            <th className="text-left px-4 py-3 font-semibold">Traitement</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-2">
                  <button onClick={() => onOpen(s)} className="font-medium text-gray-900 hover:text-[#B34A31] text-left">{s.title}</button>
                  <SourceBadge source={s.source} />
                </span>
                {s.asset_name && <span className="text-gray-400"> · {s.asset_name}</span>}
              </td>
              <td className="px-4 py-3"><DimChip d={s.dimension} /></td>
              <td className="px-4 py-3 font-mono text-gray-500">V{s.inherent_likelihood}·I{s.inherent_impact}</td>
              <td className="px-4 py-3">
                <ExpoBadge value={s.exposure} />
                {isAboveThreshold(s.exposure) && <span title={`Au-dessus du seuil d'acceptation (${threshold})`} className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded align-middle">Hors seuil</span>}
              </td>
              <td className="px-4 py-3"><LifecycleChip v={s.lifecycle_status} /></td>
              <td className="px-4 py-3 text-gray-600">{treatmentLabel(s.treatment)}</td>
              <td className="px-4 py-3 text-right">
                <DeleteScenarioButton title={s.title} onConfirm={() => onDelete(s.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
