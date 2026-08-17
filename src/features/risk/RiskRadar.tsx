import { SCORE_DIMENSION_KEYS, SCORE_DIMENSION_KIND, type ScoreDimensionKey } from '../../lib/constants'
import type { SelfDimensionData } from '../hub/useSelfDimensionScores'

const AXES = SCORE_DIMENSION_KEYS.filter((k) => SCORE_DIMENSION_KIND[k] === 'axis') as ScoreDimensionKey[]

// Libellés courts pour tenir dans le radar (les longs débordaient).
const SHORT: Record<string, string> = {
  security: 'Sécurité',
  data_protection: 'Données',
  resilience: 'Résilience',
  integrity: 'Intégrité',
  governance: 'Gouvernance',
  verifiability: 'Transparence',
}

/** Radar tri-couche : exposition inhérente (halo) / posture (trait) / résiduel (rempli). */
export function RiskRadar({ data }: { data: SelfDimensionData }): JSX.Element {
  const cx = 180, cy = 150, rad = 92, N = AXES.length
  const pt = (i: number, r: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const poly = (vals: Array<number | null>): string =>
    vals.map((v, i) => pt(i, (rad * (v ?? 0)) / 100).join(',')).join(' ')

  const posture = AXES.map((k) => data.axes.find((a) => a.key === k)?.score ?? null)
  const inherent = AXES.map((k) => data.residualByDim[k]?.inherent ?? null)
  const residual = AXES.map((k) => data.residualByDim[k]?.residual ?? null)
  const hasResidual = residual.some((v) => v != null && v > 0)

  return (
    <svg viewBox="0 0 360 300" className="w-full h-auto" role="img" aria-label="Radar tri-couche du risque">
      {[25, 50, 75, 100].map((p) => (
        <polygon key={p} points={AXES.map((_, i) => pt(i, (rad * p) / 100).join(',')).join(' ')} fill="none" stroke="#E5E7EB" strokeWidth="1" />
      ))}
      {AXES.map((k, i) => {
        const [x, y] = pt(i, rad)
        const [lx, ly] = pt(i, rad + 16)
        const anchor = lx > cx + 4 ? 'start' : lx < cx - 4 ? 'end' : 'middle'
        return (
          <g key={k}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#E5E7EB" />
            <text x={lx} y={ly} fontSize="10" fontWeight="600" fill="#6B7280" textAnchor={anchor} dominantBaseline="middle">{SHORT[k]}</text>
          </g>
        )
      })}
      {/* inhérent : halo */}
      <polygon points={poly(inherent)} fill="rgba(224,122,95,.10)" stroke="rgba(224,122,95,.35)" strokeWidth="1" strokeDasharray="2 3" />
      {/* posture : trait */}
      {posture.some((v) => v != null) && (
        <polygon points={poly(posture)} fill="none" stroke="#40916C" strokeWidth="2" strokeDasharray="4 3" />
      )}
      {/* résiduel : rempli */}
      {hasResidual && <polygon points={poly(residual)} fill="rgba(224,122,95,.30)" stroke="#E07A5F" strokeWidth="2" />}
    </svg>
  )
}
