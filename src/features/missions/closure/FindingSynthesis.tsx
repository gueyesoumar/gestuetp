import { AlertTriangle, AlertCircle, Eye, ThumbsUp } from 'lucide-react'
import type { ControlAssessment } from '../../../types/database.types'

interface Props {
  assessments: ControlAssessment[]
}

const CARDS = [
  { key: 'major_nc', label: 'NC Majeures', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { key: 'minor_nc', label: 'NC Mineures', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  { key: 'observation', label: 'Observations', icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { key: 'strength', label: 'Points forts', icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
] as const

export function FindingSynthesis({ assessments }: Props): JSX.Element {
  const counts: Record<string, number> = { major_nc: 0, minor_nc: 0, observation: 0, strength: 0 }
  for (const a of assessments) {
    const cls = a.finding_classification
    if (cls && cls in counts) counts[cls]++
  }

  return (
    <div>
      <h4 className="text-sm font-bold text-gray-900 mb-3">Synth&egrave;se des constats</h4>
      <div className="grid grid-cols-4 gap-3">
        {CARDS.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.key} className={`rounded-xl border p-4 text-center ${card.bg}`}>
              <Icon size={18} className={`mx-auto mb-1.5 ${card.color}`} />
              <p className={`text-2xl font-bold ${card.color}`}>{counts[card.key]}</p>
              <p className="text-[11px] font-medium text-gray-500 mt-0.5">{card.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
