import { useState } from 'react'
import { Plus, Trash2, ClipboardList, Download } from 'lucide-react'
import { useRiskRegister, type ScenarioRow } from './useRiskRegister'
import { useRiskCriteria } from './useRiskCriteria'
import { useSoA } from './useSoA'
import { useEdition } from '../edition/EditionContext'
import { useVocab } from '../edition/useVocab'
import { useSupervisedRegister } from './useSupervisedPortfolio'
import { ScenarioFormModal } from './ScenarioFormModal'
import { ScenarioDetail } from './ScenarioDetail'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { downloadCsv } from '../../lib/downloadCsv'
import { SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS, RISK_TREATMENTS, RISK_LIFECYCLE_STATUS, RISK_CONTROL_LINK_KINDS, riskExposure, type ScoreDimensionKey } from '../../lib/constants'

const treatmentLabel = (v: string): string => RISK_TREATMENTS.find((t) => t.value === v)?.label ?? v
const lifecycleLabel = (v: string): string => RISK_LIFECYCLE_STATUS.find((s) => s.value === v)?.label ?? v
const kindLabel = (v: string): string => RISK_CONTROL_LINK_KINDS.find((k) => k.value === v)?.label ?? v
const expColor = (v: number): string => v >= 60 ? '#C0392B' : v >= 30 ? '#B8860B' : '#27AE60'
const dimChip = (d: string | null): JSX.Element | null => {
  if (!d) return null
  const c = SCORE_DIMENSION_COLORS[d as ScoreDimensionKey] ?? '#94A3B8'
  return <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: `${c}22`, color: c }}>{SCORE_DIMENSION_LABELS[d as ScoreDimensionKey]}</span>
}

/** Registre des scénarios de risque : propre à l'org, ou consolidé cross-org pour un superviseur. */
export function RiskRegisterPage(): JSX.Element {
  const reg = useRiskRegister()
  const crit = useRiskCriteria()
  const soa = useSoA()
  const { hasCapability } = useEdition()
  const vocab = useVocab()
  const supervises = hasCapability('supervision') || hasCapability('client_portal')
  const [scope, setScope] = useState<'own' | 'all'>(supervises ? 'all' : 'own')
  const sup = useSupervisedRegister()
  const [modal, setModal] = useState(false)
  const [detail, setDetail] = useState<ScenarioRow | null>(null)

  if (reg.loading) return <LoadingSpinner />
  if (reg.error) return <ErrorAlert message={reg.error} />

  const today = new Date().toISOString().slice(0, 10)
  const exportRegister = (): void => {
    const header = ['Titre', 'Dimension', 'Vraisemblance', 'Impact', 'Exposition', 'Cycle de vie', 'Traitement', 'Prochaine revue']
    const rows = reg.scenarios.map((s) => [
      s.title, s.dimension ? SCORE_DIMENSION_LABELS[s.dimension] : '',
      s.inherent_likelihood, s.inherent_impact, s.exposure,
      lifecycleLabel(s.lifecycle_status), treatmentLabel(s.treatment), s.next_review_at ?? '',
    ])
    downloadCsv(`registre-risques-${today}.csv`, [header, ...rows])
  }
  const exportSoA = (): void => {
    const header = ['Contrôle', 'Intitulé', 'Type de barrière', 'Risque traité', 'Justification d\'applicabilité']
    const rows = soa.rows.map((r) => [r.control_code, r.control_name, kindLabel(r.kind), r.scenario_title, r.justification ?? ''])
    downloadCsv(`soa-${today}.csv`, [header, ...rows])
  }
  const consolidated = supervises && scope === 'all'

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ClipboardList size={20} className="text-[#E07A5F]" /> Registre des risques</h1>
          <p className="mt-1 text-[13px] text-gray-500">{consolidated ? `Risques de l'ensemble de vos ${vocab.entityPlural}.` : 'Scénarios EBIOS RM : cliquez un scénario pour ouvrir son nœud papillon.'}</p>
        </div>
        {!consolidated && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={exportRegister} disabled={reg.scenarios.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"><Download size={15} /> Registre</button>
            <button onClick={exportSoA} disabled={soa.rows.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"><Download size={15} /> SoA</button>
            <button onClick={() => setModal(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900"><Plus size={16} /> Nouveau scénario</button>
          </div>
        )}
      </div>

      {supervises && (
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-[13px] font-semibold">
          <button onClick={() => setScope('all')} className={`px-3 py-1.5 ${consolidated ? 'bg-forest-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Tous les {vocab.entityPlural}</button>
          <button onClick={() => setScope('own')} className={`px-3 py-1.5 border-l border-gray-200 ${!consolidated ? 'bg-forest-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Mon organisation</button>
        </div>
      )}

      {consolidated ? (
        sup.error ? <ErrorAlert message={sup.error} /> : sup.loading ? <LoadingSpinner /> : sup.rows.length === 0 ? (
          <EmptyState title="Aucun risque" description={`Vous ne supervisez pas (encore) de ${vocab.entitySingular} ayant des risques, ou aucune mission active ne vous y donne accès.`} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">{vocab.entitiesTitle}</th>
                  <th className="text-left px-4 py-3 font-semibold">Scénario</th>
                  <th className="text-left px-4 py-3 font-semibold">Dimension</th>
                  <th className="text-left px-4 py-3 font-semibold">Exposition</th>
                  <th className="text-left px-4 py-3 font-semibold">Cycle de vie</th>
                  <th className="text-left px-4 py-3 font-semibold">Traitement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sup.rows.map((r) => {
                  const exp = riskExposure(r.inherent_likelihood, r.inherent_impact)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.org_name}</td>
                      <td className="px-4 py-3 text-gray-700">{r.title}{r.asset_name && <span className="text-gray-400"> · {r.asset_name}</span>}</td>
                      <td className="px-4 py-3">{dimChip(r.dimension)}</td>
                      <td className="px-4 py-3 font-semibold" style={{ color: expColor(exp) }}>{exp}</td>
                      <td className="px-4 py-3"><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-forest-50 text-forest-700 border border-forest-100">{lifecycleLabel(r.lifecycle_status)}</span></td>
                      <td className="px-4 py-3 text-gray-600">{treatmentLabel(r.treatment)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      ) : reg.scenarios.length === 0 ? (
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
                <th className="text-left px-4 py-3 font-semibold">Cycle de vie</th>
                <th className="text-left px-4 py-3 font-semibold">Traitement</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reg.scenarios.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <button onClick={() => setDetail(s)} className="font-medium text-gray-900 hover:text-[#B34A31] text-left">{s.title}</button>
                    {s.asset_name && <span className="text-gray-400"> · {s.asset_name}</span>}
                  </td>
                  <td className="px-4 py-3">{dimChip(s.dimension)}</td>
                  <td className="px-4 py-3 font-mono text-gray-500">V{s.inherent_likelihood}·I{s.inherent_impact}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: expColor(s.exposure) }}>
                    {s.exposure}
                    {crit.isAboveThreshold(s.exposure) && <span title={`Au-dessus du seuil d'acceptation (${crit.acceptanceThreshold})`} className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded align-middle">Hors seuil</span>}
                  </td>
                  <td className="px-4 py-3"><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-forest-50 text-forest-700 border border-forest-100">{lifecycleLabel(s.lifecycle_status)}</span></td>
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
      {detail && <ScenarioDetail scenario={detail} catalog={reg.catalog} onClose={() => setDetail(null)} />}
    </div>
  )
}
