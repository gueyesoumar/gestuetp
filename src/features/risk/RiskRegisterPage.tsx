import { useState } from 'react'
import { Plus, Trash2, ClipboardList } from 'lucide-react'
import { useRiskRegister, type ScenarioRow } from './useRiskRegister'
import { ScenarioFormModal } from './ScenarioFormModal'
import { ScenarioBowtie } from './ScenarioBowtie'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS, RISK_TREATMENTS } from '../../lib/constants'

const treatmentLabel = (v: string): string => RISK_TREATMENTS.find((t) => t.value === v)?.label ?? v

/** Registre des scénarios de risque : tableau, création, nœud papillon. */
export function RiskRegisterPage(): JSX.Element {
  const reg = useRiskRegister()
  const [modal, setModal] = useState(false)
  const [bowtie, setBowtie] = useState<ScenarioRow | null>(null)

  if (reg.loading) return <LoadingSpinner />
  if (reg.error) return <ErrorAlert message={reg.error} />

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ClipboardList size={20} className="text-[#E07A5F]" /> Registre des risques</h1>
          <p className="mt-1 text-[13px] text-gray-500">Scénarios EBIOS RM — cliquez un scénario pour ouvrir son nœud papillon.</p>
        </div>
        <button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900">
          <Plus size={16} /> Nouveau scénario
        </button>
      </div>

      {reg.scenarios.length === 0 ? (
        <EmptyState title="Registre vide" description="Créez votre premier scénario de risque avec le bouton ci-dessus." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Scénario</th>
                <th className="text-left px-4 py-3 font-semibold">Dimension</th>
                <th className="text-left px-4 py-3 font-semibold">Cotation</th>
                <th className="text-left px-4 py-3 font-semibold">Exposition</th>
                <th className="text-left px-4 py-3 font-semibold">Traitement</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reg.scenarios.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button onClick={() => setBowtie(s)} className="font-medium text-gray-900 hover:text-[#B34A31] text-left">{s.title}</button>
                    {s.asset_name && <span className="text-gray-400"> · {s.asset_name}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {s.dimension && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: `${SCORE_DIMENSION_COLORS[s.dimension]}22`, color: SCORE_DIMENSION_COLORS[s.dimension] }}>{SCORE_DIMENSION_LABELS[s.dimension]}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500">V{s.inherent_likelihood}·I{s.inherent_impact}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: s.exposure >= 60 ? '#C0392B' : s.exposure >= 30 ? '#B8860B' : '#27AE60' }}>{s.exposure}</td>
                  <td className="px-4 py-3 text-gray-600">{treatmentLabel(s.treatment)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => void reg.deleteScenario(s.id)} className="text-gray-400 hover:text-red-600" aria-label="Supprimer"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <ScenarioFormModal catalog={reg.catalog} onClose={() => setModal(false)} onCreate={reg.createScenario} />}
      {bowtie && <ScenarioBowtie scenario={bowtie} catalog={reg.catalog} onClose={() => setBowtie(null)} />}
    </div>
  )
}
