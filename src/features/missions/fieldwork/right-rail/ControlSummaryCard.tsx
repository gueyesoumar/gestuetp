import { CONFORMITY_LEVELS } from '../../mission-constants'

interface ControlSummaryCardProps {
  code: string
  name: string
  riskLevel: number | null
  conformityLevel: string | null
}

const VERDICT_STYLE: Record<string, string> = {
  c: 'bg-green-50 text-green-700',
  lc: 'bg-green-50 text-green-700',
  pc: 'bg-amber-50 text-amber-700',
  nc: 'bg-red-50 text-red-600',
  na: 'bg-gray-100 text-gray-500',
}

/** Carte résumé en tête du rail : code + verdict, intitulé, niveau de risque. */
export function ControlSummaryCard({ code, name, riskLevel, conformityLevel }: ControlSummaryCardProps) {
  const verdict = CONFORMITY_LEVELS.find((c) => c.key === conformityLevel)
  const risk = riskLevel ?? 0

  return (
    <div className="rounded-lg border border-gray-200 bg-gradient-to-b from-[#f6f9f6] to-white p-2.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[12px] font-bold text-forest-700">{code}</span>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${verdict ? VERDICT_STYLE[verdict.key] : 'bg-gray-100 text-gray-400'}`}>
          {verdict ? verdict.label : 'À évaluer'}
        </span>
      </div>
      <p className="mt-1 text-[12px] font-medium text-gray-800 leading-snug">{name}</p>
      {riskLevel != null && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-gray-500">
          <span>Risque</span>
          <span className="flex gap-0.5" aria-label={`Risque ${risk} sur 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className={`w-2 h-2 rounded-[2px] ${i <= risk ? 'bg-gold-500' : 'bg-gray-200'}`} />
            ))}
          </span>
          <span className="font-mono">{risk}/5</span>
        </div>
      )}
    </div>
  )
}
