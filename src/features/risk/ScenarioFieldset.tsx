import {
  SCORE_DIMENSION_KEYS, SCORE_DIMENSION_KIND, SCORE_DIMENSION_LABELS,
  RISK_LIKELIHOOD_LEVELS, RISK_IMPACT_LEVELS, riskExposure,
  type ScoreDimensionKey,
} from '../../lib/constants'
import type { RiskCatalogEntry, ScoreDimension } from '../../types/database.types'

const AXES = SCORE_DIMENSION_KEYS.filter((k) => SCORE_DIMENSION_KIND[k] === 'axis') as ScoreDimensionKey[]
const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

export interface ScenarioFields {
  dimension: ScoreDimension | ''
  threat: string
  feared: string
  vulnerability: string
  likelihood: number
  impact: number
}

/** Champs communs d'un scénario de risque (création + promotion). État contrôlé par le parent. */
export function ScenarioFieldset({ value, onChange, catalog }: {
  value: ScenarioFields
  onChange: (patch: Partial<ScenarioFields>) => void
  catalog: RiskCatalogEntry[]
}): JSX.Element {
  const threats = catalog.filter((c) => c.kind === 'menace_type')
  const fearedEvents = catalog.filter((c) => c.kind === 'evenement_redoute')
  const exposure = riskExposure(value.likelihood, value.impact)

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1">Dimension *</label>
          <select value={value.dimension} onChange={(e) => onChange({ dimension: e.target.value as ScoreDimension })} className={field}>
            <option value="">Sélectionner…</option>
            {AXES.map((k) => <option key={k} value={k}>{SCORE_DIMENSION_LABELS[k]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1">Menace (ISO 27005)</label>
          <select value={value.threat} onChange={(e) => onChange({ threat: e.target.value })} className={field}>
            <option value="">—</option>
            {threats.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-[12px] font-medium text-gray-600 mb-1">Événement redouté (EBIOS RM)</label>
        <select value={value.feared} onChange={(e) => onChange({ feared: e.target.value })} className={field}>
          <option value="">—</option>
          {fearedEvents.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[12px] font-medium text-gray-600 mb-1">Vulnérabilité</label>
        <input value={value.vulnerability} onChange={(e) => onChange({ vulnerability: e.target.value })} className={field} placeholder="ex. sauvegardes non testées" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1">Vraisemblance</label>
          <select value={value.likelihood} onChange={(e) => onChange({ likelihood: +e.target.value })} className={field}>
            {RISK_LIKELIHOOD_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.value} · {l.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-600 mb-1">Impact</label>
          <select value={value.impact} onChange={(e) => onChange({ impact: +e.target.value })} className={field}>
            {RISK_IMPACT_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.value} · {l.label}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-[12px]">
        <span className="text-gray-500">Exposition inhérente</span>
        <span className="font-bold" style={{ color: exposure >= 60 ? '#C0392B' : exposure >= 30 ? '#D4A843' : '#27AE60' }}>{exposure}/100</span>
      </div>
    </>
  )
}
