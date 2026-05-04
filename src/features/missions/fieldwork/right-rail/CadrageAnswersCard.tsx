import { ClipboardList, AlertCircle } from 'lucide-react'
import type { CadrageAnswer } from './useControlContext'

interface CadrageAnswersCardProps {
  answers: CadrageAnswer[]
  hasInstance: boolean
}

const WEIGHT_CFG: Record<number, { label: string; color: string }> = {
  3: { label: 'Preuve forte', color: 'bg-red-50 text-red-700 border-red-200' },
  2: { label: 'Partiel', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  1: { label: 'Contexte', color: 'bg-gray-50 text-gray-600 border-gray-200' },
}

function formatResponse(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (Array.isArray(value)) return value.length === 0 ? '—' : value.join(', ')
  if (typeof value === 'string') return value.trim() || '—'
  if (typeof value === 'number') return String(value)
  return JSON.stringify(value)
}

export function CadrageAnswersCard({ answers, hasInstance }: CadrageAnswersCardProps) {
  if (!hasInstance) return null

  return (
    <div className="border border-forest-200 rounded-xl bg-gradient-to-br from-forest-50/40 to-white overflow-hidden">
      <div className="px-4 py-2.5 bg-forest-50 border-b border-forest-200 flex items-center gap-2">
        <ClipboardList size={14} className="text-forest-700" />
        <h5 className="text-[12px] font-semibold text-forest-900 flex-1">R&eacute;ponses cadrage li&eacute;es</h5>
        <span className="text-[10px] font-mono text-forest-700 bg-white/60 px-1.5 py-0.5 rounded">{answers.length}</span>
      </div>

      <div className="p-3">
        {answers.length === 0 ? (
          <div className="flex items-start gap-2 text-[11px] text-gray-400 italic">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <p>Aucune question cadrage n&apos;est mapp&eacute;e &agrave; ce contr&ocirc;le.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {answers.map((ans) => {
              const cfg = WEIGHT_CFG[ans.weight] ?? WEIGHT_CFG[1]
              const formatted = formatResponse(ans.response_value)
              return (
                <li key={ans.question_id} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="font-mono text-[10px] text-gray-500">{ans.question_code}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 italic line-clamp-2">{ans.question_text}</p>
                  <div className="bg-white border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-800 whitespace-pre-wrap break-words">
                    {formatted}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
