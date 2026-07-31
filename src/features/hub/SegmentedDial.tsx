import { bandColor, bandLabel } from './trustBand'

// Cadran central du cockpit. Remplit son conteneur (dimensionne par l'appelant en
// unites de conteneur -> orbite fluide). Deux modes :
//  - segments fournis -> cadran a 4 secteurs (une dimension du score par quart) ;
//  - sinon -> anneau composite unique (perspectives portefeuille / groupe).
// Couleurs plates issues des paliers (BRAND.md), pas de degrade.

const VIEW = 210
const GAP_DEG = 8
const TRACK = 'rgba(255,255,255,0.09)'

interface SegmentedDialProps {
  score: number | null
  segments?: readonly (number | null)[]
}

export function SegmentedDial({ score, segments }: SegmentedDialProps): JSX.Element {
  const c = VIEW / 2
  const r = VIEW * 0.4
  const w = VIEW * 0.062
  const circ = 2 * Math.PI * r
  const color = bandColor(score)
  const arcs: JSX.Element[] = []

  if (segments && segments.length > 0) {
    const arc = 360 / segments.length
    const segLen = (circ * (arc - GAP_DEG)) / 360
    segments.forEach((value, i) => {
      const rot = -90 + i * arc + GAP_DEG / 2
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
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="h-full w-full" role="img" aria-label={`Trust Score ${score ?? 'non évalué'}`}>
        {arcs}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[clamp(28px,7.4cqmin,46px)] font-extrabold leading-none tabular-nums text-white">
          {score === null ? '—' : score}
        </span>
        <span className="mt-0.5 text-[clamp(8px,1.9cqmin,12px)] text-white/40">/ 100</span>
        <span className="mt-1.5 text-[clamp(10px,2.1cqmin,13px)] font-bold" style={{ color }}>{bandLabel(score)}</span>
      </div>
    </div>
  )
}
