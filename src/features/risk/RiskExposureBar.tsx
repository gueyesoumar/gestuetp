import { expColor } from './riskLabels'

const pct = (v: number): number => Math.round(v * 100)

/** Barre d'exposition inhérente graduée (Maîtrisé -> Critique) + cotation + résiduel.
 *  Partagée par la fiche lecture seule (AuditedScenarioBowtie) et l'onglet Apprécier. */
export function RiskExposureBar({ inherentExp, residual, hasBarriers, likelihood, impact, bump = 0, effPrev, effCorr }: {
  inherentExp: number; residual: number; hasBarriers: boolean
  likelihood: number; impact: number; bump?: number
  effPrev?: number | null; effCorr?: number | null
}): JSX.Element {
  return (
    <div className="flex items-center gap-5 flex-wrap rounded-lg bg-gray-50 px-4 py-3">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-gray-400">Exposition inhérente</div>
        <div className="font-mono font-bold text-[30px] leading-none" style={{ color: expColor(inherentExp) }}>{inherentExp}<span className="text-[14px] text-gray-400">/100</span></div>
      </div>
      <div className="flex-1 min-w-[200px]">
        <div className="relative h-2.5 rounded-full" style={{ background: 'linear-gradient(90deg,#27AE60 0 30%,#B8860B 30% 60%,#C0392B 60% 100%)' }}>
          <span className="absolute -top-1 w-0.5 h-[18px] bg-gray-900 rounded" style={{ left: `${inherentExp}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 font-semibold mt-1.5"><span>Maîtrisé</span><span>Critique</span></div>
        <div className="text-[11.5px] text-gray-500 mt-1.5">
          Vraisemblance <b className="font-mono">{likelihood}/4</b>{bump > 0 && <b className="font-mono" style={{ color: '#C0392B' }}>+{bump}</b>} · Impact <b className="font-mono">{impact}/4</b> · {hasBarriers
            ? <>Résiduel <b style={{ color: expColor(residual) }}>{residual}</b>{(effPrev != null || effCorr != null) && <> (préventif {effPrev == null ? '-' : `${pct(effPrev)}%`} · correctif {effCorr == null ? '-' : `${pct(effCorr)}%`})</>}</>
            : <span style={{ color: '#B8860B', fontWeight: 600 }}>Résiduel = inhérent · aucune barrière</span>}
        </div>
      </div>
    </div>
  )
}
