import { SCORE_DIMENSION_LABELS, SCORE_DIMENSION_COLORS, RISK_TREATMENTS, RISK_LIFECYCLE_STATUS, type ScoreDimensionKey } from '../../lib/constants'

/** Libellés & chips partagés du module Risk (registre propre + consolidé). */
export const treatmentLabel = (v: string): string => RISK_TREATMENTS.find((t) => t.value === v)?.label ?? v
export const lifecycleLabel = (v: string): string => RISK_LIFECYCLE_STATUS.find((s) => s.value === v)?.label ?? v
export const expColor = (v: number): string => v >= 60 ? '#C0392B' : v >= 30 ? '#B8860B' : '#27AE60'

export function DimChip({ d }: { d: string | null }): JSX.Element | null {
  if (!d) return null
  const c = SCORE_DIMENSION_COLORS[d as ScoreDimensionKey] ?? '#94A3B8'
  return <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: `${c}22`, color: c }}>{SCORE_DIMENSION_LABELS[d as ScoreDimensionKey]}</span>
}

export function LifecycleChip({ v }: { v: string }): JSX.Element {
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-forest-50 text-forest-700 border border-forest-100">{lifecycleLabel(v)}</span>
}
