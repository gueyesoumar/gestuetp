import { ArrowUpRight, Check } from 'lucide-react'
import type { MissionRisk, RiskLevel } from '../../../types/database.types'

interface ScopingRiskCardProps {
  risk: MissionRisk
  onRemove: (id: string) => void
  onPromote: (risk: MissionRisk) => void
  saving: boolean
}

const RISK_STYLES: Record<RiskLevel, { label: string; cls: string }> = {
  critical: { label: 'Critique', cls: 'bg-red-50 text-red-600' },
  high: { label: 'Élevé', cls: 'bg-amber-50 text-amber-600' },
  medium: { label: 'Moyen', cls: 'bg-yellow-50 text-yellow-700' },
  low: { label: 'Faible', cls: 'bg-gray-100 text-gray-500' },
}

export function ScopingRiskCard({ risk, onRemove, onPromote, saving }: ScopingRiskCardProps) {
  const style = RISK_STYLES[risk.risk_level]
  const promoted = risk.promoted_at != null

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${style.cls}`}>{style.label}</span>
        <span className="text-[13px] font-semibold text-gray-900 flex-1">{risk.title}</span>
        <button onClick={() => onRemove(risk.id)} disabled={saving} className="text-gray-300 hover:text-red-500 text-xs">&#10005;</button>
      </div>
      {risk.description && (
        <div className="px-4 py-3 text-xs text-gray-700 leading-relaxed">{risk.description}</div>
      )}
      <div className="flex items-center gap-1 flex-wrap px-4 pb-3">
        {risk.source && <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">Source: {risk.source}</span>}
        <div className="flex-1" />
        {promoted ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700"><Check size={13} /> Promu au registre</span>
        ) : (
          <button onClick={() => onPromote(risk)} disabled={saving}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 hover:text-forest-900 disabled:opacity-50">
            <ArrowUpRight size={13} /> Promouvoir vers le registre
          </button>
        )}
      </div>
    </div>
  )
}
