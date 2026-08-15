import { SCORE_DIMENSION_KEYS, SCORE_DIMENSION_KIND, SCORE_DIMENSION_LABELS, type ScoreDimensionKey } from '../../lib/constants'
import type { SelfDimensionData } from '../hub/useSelfDimensionScores'

const AXES = SCORE_DIMENSION_KEYS.filter((k) => SCORE_DIMENSION_KIND[k] === 'axis') as ScoreDimensionKey[]

/** Radar tri-couche : exposition inhérente (halo) / posture (trait) / résiduel (rempli). */
export function RiskRadar({ data }: { data: SelfDimensionData }): JSX.Element {
  const cx = 170, cy = 150, rad = 100, N = AXES.length
  const pt = (i: number, r: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
  }
  const poly = (vals: Array<number | null>): string =>
    vals.map((v, i) => pt(i, (rad * (v ?? 0)) / 100).join(',')).join(' ')

  const posture = AXES.map((k) => data.axes.find((a) => a.key === k)?.score ?? null)
  const inherent = AXES.map((k) => data.residualByDim[k]?.inherent ?? null)
  const residual = AXES.map((k) => data.residualByDim[k]?.residual ?? null)

  return (
    <svg viewBox="0 0 340 300" className="w-full h-auto">
      {[25, 50, 75, 100].map((p) => (
        <polygon key={p} points={AXES.map((_, i) => pt(i, (rad * p) / 100).join(',')).join(' ')} fill="none" stroke="#E5E7EB" strokeWidth="1" />
      ))}
      {AXES.map((k, i) => {
        const [x, y] = pt(i, rad)
        const [lx, ly] = pt(i, rad + 22)
        return (
          <g key={k}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#E5E7EB" />
            <text x={lx} y={ly} fontSize="9.5" fill="#6B7280" textAnchor={lx > cx + 5 ? 'start' : lx < cx - 5 ? 'end' : 'middle'} dominantBaseline="middle">
              {SCORE_DIMENSION_LABELS[k]}
            </text>
          </g>
        )
      })}
      {/* inhérent : halo */}
      <polygon points={poly(inherent)} fill="rgba(224,122,95,.10)" stroke="rgba(224,122,95,.35)" strokeWidth="1" strokeDasharray="2 3" />
      {/* posture : trait */}
      <polygon points={poly(posture)} fill="none" stroke="#40916C" strokeWidth="2" strokeDasharray="4 3" />
      {/* résiduel : rempli */}
      <polygon points={poly(residual)} fill="rgba(224,122,95,.30)" stroke="#E07A5F" strokeWidth="2" />
    </svg>
  )
}
