import { Check } from 'lucide-react'
import type { Question } from '../../types/database.types'

interface WizardCompletedSummaryProps {
  questions: Question[]
  responses: Map<string, unknown>
  currentIndex: number
  onGoTo: (index: number) => void
}

export function WizardCompletedSummary({ questions, responses, currentIndex, onGoTo }: WizardCompletedSummaryProps) {
  const answered = questions.slice(0, currentIndex).filter((q) => responses.has(q.code))
  if (answered.length === 0) return null

  return (
    <div className="px-6 border-b border-gray-100">
      {answered.map((q, i) => {
        const value = responses.get(q.code)
        return (
          <div key={q.code} className="flex items-center gap-2 py-2.5 border-b border-gray-50 last:border-b-0">
            <div className="w-[18px] h-[18px] rounded-full bg-green-600 text-white flex items-center justify-center shrink-0"><Check size={10} /></div>
            <span className="text-xs text-gray-400 flex-1 truncate">{q.text}</span>
            <span className="text-xs font-medium text-gray-900 max-w-[200px] truncate">{formatValue(value)}</span>
            <button onClick={() => onGoTo(i)} className="text-[10px] text-forest-700 hover:underline shrink-0">Modifier</button>
          </div>
        )
      })}
    </div>
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '\u2014'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}
