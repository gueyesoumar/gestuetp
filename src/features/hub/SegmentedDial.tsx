import { bandColor, bandLabel } from './trustBand'

// Cadran central du cockpit. Deux modes :
//  - segments fournis -> cadran a 4 secteurs (une dimension du score par quart) ;
//  - sinon -> anneau composite unique (perspectives portefeuille / groupe).
// Couleurs plates issues des paliers (BRAND.md), pas de degrade.

interface SegmentedDialProps {
  score: number | null
  segments?: readonly (number | null)[]
  size?: number
}

const GAP_DEG = 8
const TRACK = 'rgba(255,255,255,0.09)'

export function SegmentedDial({ score, segments, size = 210 }: SegmentedDialProps): JSX.Element {
  const c = size / 2
  const r = size * 0.4
  const w = size * 0.062
  const circ = 2 * Math.PI * r
  const color = bandColor(score)
  const arcs: JSX.Element[] = []

  if (segments && segments.length > 0) {
    const segLen = (circ * (90 - GAP_DEG)) / 360
    segments.forEach((value, i) => {
      const rot = -90 + i * 90 + GAP_DEG / 2
      arcs.push(
        <circle key={`bg-${i}`} cx={c} cy={c} r={r} fill="none" stroke={TRACK} strokeWidth={w}
          strokeLinecap="round" strokeDasharray={`${segLen} ${circ - segLen}`} transform={`rotate(${rot} ${c} ${c})`} />,
      )
      if (value !== null) {
        const fill = (segLen * value) / 100
        arcs.push(
          <circle key={`fg-${i}`} cx={c} cy={c} r={r} fill="none" stroke={bandColor(value)} strokeWidth={w}
            strokeLinecap="round" strokeDasharray={`${fill} ${circ - fill}`} transform={`rotate(${rot} ${c} ${c})`} />,
        )
      }
    })
  } else {
    arcs.push(<circle key="bg" cx={c} cy={c} r={r} fill="none" stroke={TRACK} strokeWidth={w} />)
    if (score !== null) {
      arcs.push(
        <circle key="fg" cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)} transform={`rotate(-90 ${c} ${c})`} />,
      )
    }
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full" role="img" aria-label={`Trust Score ${score ?? 'non évalué'}`}>
        {arcs}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[46px] font-extrabold leading-none tabular-nums text-white">{score === null ? '—' : score}</span>
        <span className="mt-0.5 text-[12px] text-white/40">/ 100</span>
        <span className="mt-1.5 text-[13px] font-bold" style={{ color }}>{bandLabel(score)}</span>
      </div>
    </div>
  )
}
