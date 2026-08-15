import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { RISK_MASTERY_WEIGHT, SCORE_COEFFICIENT_FLOOR } from '../../lib/constants'
import type { SelfDimensionData } from '../hub/useSelfDimensionScores'

const CIRC = 2 * Math.PI * 46
const band = (v: number): [string, string] => v >= 80 ? ['Solide', '#27AE60'] : v >= 60 ? ['À surveiller', '#D4A843'] : ['À risque', '#C0392B']

/**
 * Simulateur « et si » : un curseur de couverture de traitement recalcule, en
 * temps réel et 100% côté client, la maîtrise du risque et le score de confiance.
 * Rend visible le lien risque → confiance. Aucune écriture.
 */
export function RiskSimulator({ score }: { score: SelfDimensionData }): JSX.Element {
  const [cov, setCov] = useState(0)

  const baseResiduals = useMemo(
    () => Object.values(score.residualByDim).map((r) => r?.residual ?? 0).filter((v) => v > 0),
    [score.residualByDim],
  )
  const t = cov / 100
  const hasRisk = baseResiduals.length > 0
  const simResidual = baseResiduals.map((r) => r * (1 - t))
  const avgResidual = simResidual.length ? Math.round(simResidual.reduce((s, x) => s + x, 0) / simResidual.length) : 0
  const simMastery = hasRisk ? Math.max(0, 100 - avgResidual) : null
  const penaltyFrac = simMastery === null ? 0 : RISK_MASTERY_WEIGHT * (1 - simMastery / 100)
  const simComposite = score.compositePosture === null
    ? null
    : Math.round(score.compositePosture * Math.max(SCORE_COEFFICIENT_FLOOR, score.coefficientBase * (1 - penaltyFrac)))

  // Le cadran montre le composite si une posture existe, sinon la maîtrise du risque.
  const dialVal = simComposite ?? simMastery ?? 0
  const dialLabel = simComposite !== null ? 'confiance' : 'maîtrise'
  const [bl, bc] = band(dialVal)

  const gain = simComposite !== null && score.composite !== null ? simComposite - score.composite : null

  return (
    <div className="rounded-xl border border-[#E07A5F]/30 bg-white p-5" style={{ backgroundImage: 'radial-gradient(360px 160px at 90% -20%, rgba(224,122,95,.10), transparent 60%)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-[#E07A5F]" />
        <h3 className="text-sm font-bold text-gray-900">Simulateur « et si »</h3>
      </div>
      <p className="text-[11px] text-gray-400 mb-4">Traitez les risques prioritaires et observez la confiance réagir.</p>

      {!hasRisk ? (
        <p className="text-[13px] text-gray-400 py-6 text-center">Ajoutez des scénarios cotés pour activer le simulateur.</p>
      ) : (
        <>
          <div className="flex items-center gap-5">
            <div className="relative w-[120px] h-[120px] shrink-0">
              <svg viewBox="0 0 120 120" width="120" height="120">
                <circle cx="60" cy="60" r="46" fill="none" stroke="#EEF0EF" strokeWidth="9" />
                <circle cx="60" cy="60" r="46" fill="none" stroke={bc} strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - dialVal / 100)} transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset .15s ease, stroke .15s ease' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-gray-900 tabular-nums">{dialVal}</span>
                <span className="text-[9px] text-gray-400">/ 100 · {dialLabel}</span>
                <span className="text-[10px] font-bold mt-0.5" style={{ color: bc }}>{bl}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[10px] font-mono uppercase tracking-wide text-gray-400 mb-1">
                <span>Exposition résiduelle moy.</span><span>{avgResidual}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${avgResidual}%`, background: 'linear-gradient(90deg,#B34A31,#E07A5F)', transition: 'width .15s ease' }} />
              </div>
              <p className="text-[12.5px] text-gray-600 mt-3 leading-snug">
                {simComposite !== null && gain !== null
                  ? <>À {cov}% de traitement, la confiance passe de <b>{score.composite}</b> à <b style={{ color: '#B34A31' }}>{simComposite}</b> (<b>{gain >= 0 ? '+' : ''}{gain} pts</b>).</>
                  : <>À {cov}% de traitement, la maîtrise du risque atteint <b style={{ color: '#B34A31' }}>{simMastery}/100</b>.</>}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <label className="flex justify-between text-[12px] text-gray-500 mb-2">Couverture de traitement <b className="text-[#B34A31] font-mono">{cov}%</b></label>
            <input type="range" min={0} max={100} value={cov} onChange={(e) => setCov(+e.target.value)} className="w-full accent-[#E07A5F]" />
          </div>
        </>
      )}
    </div>
  )
}
