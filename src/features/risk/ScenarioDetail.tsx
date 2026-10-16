import { useState } from 'react'
import { X, ArrowRight, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ExpositionHelp } from './ExpositionHelp'
import { HelpHint } from './HelpHint'
import { useScenarioControls } from './useScenarioControls'
import { useScenarioIncidents } from './useScenarioIncidents'
import { useScenarioPolicies } from '../policy/useScenarioPolicies'
import { ScenarioAppreciationTab } from './ScenarioAppreciationTab'
import { ScenarioActionsSection } from './ScenarioActionsSection'
import { ScenarioAcceptanceCard } from './ScenarioAcceptanceCard'
import { ScenarioReviewSection } from './ScenarioReviewSection'
import { useScenarioProvenance } from './useScenarioProvenance'
import { computeBowtieModel } from './scenarioBowtieModel'
import { scenarioCompleteness } from './scenarioCompleteness'
import { RISK_PHASES, type RiskPhaseKey } from './phases'
import { SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS, RISK_LIFECYCLE_STATUS } from '../../lib/constants'
import type { RiskCatalogEntry } from '../../types/database.types'
import type { ScenarioRow } from './useRiskRegister'
import { expColor } from './riskLabels'

const lifecycleLabel = (v: string): string => RISK_LIFECYCLE_STATUS.find((s) => s.value === v)?.label ?? v

/** Détail d'un scénario : bande de synthèse + jauge + 3 onglets (triptyque ISO 27005). */
export function ScenarioDetail({ scenario, catalog, onClose }: { scenario: ScenarioRow; catalog: RiskCatalogEntry[]; onClose: () => void }): JSX.Element {
  const [tab, setTab] = useState<RiskPhaseKey>('apprecier')
  const ctrl = useScenarioControls(scenario.id)
  const inc = useScenarioIncidents(scenario.id, scenario.dimension)
  const pol = useScenarioPolicies(scenario.id)
  const model = computeBowtieModel(scenario, ctrl.barriers, pol.barriers, inc.bump)
  const comp = scenarioCompleteness(scenario)
  const prov = useScenarioProvenance(scenario.id)
  const dimColor = scenario.dimension ? SCORE_DIMENSION_COLORS[scenario.dimension] : '#94A3B8'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Bande de synthèse */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">{scenario.title}</h3>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {scenario.dimension && <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: `${dimColor}22`, color: dimColor }}>{SCORE_DIMENSION_LABELS[scenario.dimension]}</span>}
                <span className="inline-flex items-center gap-0.5"><span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-forest-50 text-forest-700 border border-forest-100">{lifecycleLabel(scenario.lifecycle_status)}</span>
                  <HelpHint title="Cycle de vie du risque">
                    <p>Étapes ISO 27005 : <b>identifié</b> &rarr; <b>analysé</b> (coté) &rarr; <b>évalué</b> (vs seuil) &rarr; <b>traité</b> &rarr; <b>accepté</b> (résiduel formellement validé) &rarr; <b>surveillé</b> (revue périodique).</p>
                  </HelpHint>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-400">Exposition <ExpositionHelp /></span>
              </div>
              {prov && (
                <p className="mt-1 text-[11px] text-gray-400">
                  Issu {prov.origin_type === 'finding' ? 'du constat' : prov.origin_type === 'mission_risk' ? 'du risque' : 'de la mission'}
                  {prov.origin_label ? ` « ${prov.origin_label} »` : ''}{prov.mission_name ? ` · ${prov.mission_name}` : ''}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={18} /></button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Inhérent" value={model.inherentExp} color={expColor(model.inherentExp)} />
            <Metric label="Résiduel" value={model.hasBarriers ? model.residual : null} color={expColor(model.residual)} />
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-gray-400">Prochaine revue</div>
              <div className="text-[13px] font-semibold text-gray-700">{scenario.next_review_at ?? 'Non planifiée'}</div>
            </div>
            <CompletenessGauge comp={comp} />
          </div>
        </div>

        {/* Barre d'onglets (triptyque) */}
        <div className="flex border-b border-gray-100 px-3">
          {RISK_PHASES.map((p) => (
            <button key={p.key} onClick={() => setTab(p.key)}
              className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors ${tab === p.key ? 'text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              style={tab === p.key ? { borderColor: p.accent, color: p.accent } : undefined}>
              {p.index} · {p.label}
            </button>
          ))}
        </div>

        {/* Contenu de l'onglet actif */}
        {tab === 'apprecier' && <ScenarioAppreciationTab scenario={scenario} catalog={catalog} model={model} ctrl={ctrl} inc={inc} pol={pol} />}
        {tab === 'traiter' && (
          <>
            <ScenarioActionsSection scenarioId={scenario.id} />
            <ScenarioAcceptanceCard scenarioId={scenario.id} residual={model.residual} />
          </>
        )}
        {tab === 'surveiller' && (
          <>
            <ScenarioReviewSection scenarioId={scenario.id} residual={model.residual} inherent={model.inherentExp} nextReviewAt={scenario.next_review_at} />
            <div className="px-5 pb-5">
              <Link to="/piste-audit" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-forest-700 hover:text-forest-900">
                <History size={14} /> Voir l&apos;historique dans la piste d&apos;audit <ArrowRight size={13} />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: number | null; color: string }): JSX.Element {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-[15px] font-bold" style={value == null ? undefined : { color }}>{value == null ? '-' : value}</div>
    </div>
  )
}

function CompletenessGauge({ comp }: { comp: ReturnType<typeof scenarioCompleteness> }): JSX.Element {
  const tone = comp.pct >= 80 ? '#2D6A4F' : comp.pct >= 40 ? '#B8860B' : '#C0392B'
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2" title={comp.items.map((i) => `${i.done ? '✓' : '○'} ${i.label}`).join('\n')}>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-gray-400">
        <span>Complétude</span><span className="font-mono">{comp.filled}/{comp.total}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${comp.pct}%`, background: tone }} />
      </div>
    </div>
  )
}
