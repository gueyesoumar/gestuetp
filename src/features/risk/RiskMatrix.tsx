import { SCORE_DIMENSION_COLORS, RISK_LIKELIHOOD_LEVELS, RISK_IMPACT_LEVELS } from '../../lib/constants'
import type { ScenarioRow } from './useRiskRegister'

/** Matrice 4×4 Vraisemblance × Impact ; bulles colorées par dimension, taille = exposition. */
export function RiskMatrix({ scenarios }: { scenarios: ScenarioRow[] }): JSX.Element {
  const cells = []
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const impact = 4 - r, like = c + 1, heat = impact * like
      const color = heat >= 12 ? '#C0392B' : heat >= 6 ? '#D4A843' : '#27AE60'
      cells.push(<div key={`${r}-${c}`} style={{ background: color, opacity: 0.06 + (heat / 16) * 0.16 }} />)
    }
  }
  return (
    <div>
      <div className="flex gap-2">
        <div className="flex flex-col justify-between py-1 text-[9px] font-mono text-gray-400" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          <span>Impact &rarr;</span>
        </div>
        <div className="flex-1">
          <div className="relative rounded-lg border border-gray-200 overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', gridTemplateRows: 'repeat(4,1fr)' }}>{cells}</div>
            <div className="absolute inset-0 pointer-events-none">
              {scenarios.map((s) => {
                const x = ((s.inherent_likelihood - 0.5) / 4) * 100
                const y = ((4 - s.inherent_impact + 0.5) / 4) * 100
                const size = 16 + (s.exposure / 100) * 20
                const color = s.dimension ? SCORE_DIMENSION_COLORS[s.dimension] : '#94A3B8'
                return (
                  <div key={s.id} title={`${s.title} — exposition ${s.exposure}`}
                    className="absolute rounded-full grid place-items-center text-[9px] font-bold text-white pointer-events-auto"
                    style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, transform: 'translate(-50%,-50%)', background: color, border: '1.5px solid rgba(255,255,255,.7)' }}>
                    {s.title.charAt(0).toUpperCase()}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] font-mono text-gray-400">
            {RISK_LIKELIHOOD_LEVELS.map((l) => <span key={l.value}>{l.label}</span>)}
          </div>
          <div className="mt-0.5 text-center text-[9px] font-mono text-gray-400">Vraisemblance &rarr;</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400">
        {RISK_IMPACT_LEVELS.slice().reverse().map((i) => <span key={i.value}>{i.value}·{i.label}</span>)}
      </div>
    </div>
  )
}
