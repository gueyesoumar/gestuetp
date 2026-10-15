import type { RiskPhaseKey } from './phases'
import { RISK_PHASE_BY_KEY } from './phases'

/**
 * Marqueur de phase du triptyque ISO 27005 (RFC 0017 Lot A) : pastille numérotée
 * + libellé + légende. Présentationnel pur, nourri par la source unique `phases.ts`.
 */
export function RiskPhaseBand({ phase }: { phase: RiskPhaseKey }): JSX.Element {
  const p = RISK_PHASE_BY_KEY[phase]
  return (
    <div className="flex items-center gap-2.5 pt-1">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white"
        style={{ background: p.accent }}
      >
        {p.index}
      </span>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: p.accent }}>{p.label}</span>
        <span className="text-[12px] text-gray-400">{p.caption}</span>
      </div>
    </div>
  )
}
