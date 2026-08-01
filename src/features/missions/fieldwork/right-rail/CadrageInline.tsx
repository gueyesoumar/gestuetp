import { useState } from 'react'
import { ClipboardCheck, ChevronDown, ChevronRight } from 'lucide-react'
import type { CadrageAnswer } from './useControlContext'

interface CadrageInlineProps {
  answers: CadrageAnswer[]
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

export function CadrageInline({ answers }: CadrageInlineProps) {
  const [open, setOpen] = useState(false)
  if (answers.length === 0) return null

  return (
    <div className="rounded-xl border border-forest-300 bg-forest-50/60 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-forest-200 bg-forest-100/40 hover:bg-forest-100/70 transition-colors text-left"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} className="text-forest-700 shrink-0" /> : <ChevronRight size={14} className="text-forest-700 shrink-0" />}
        <div className="w-6 h-6 rounded-md bg-forest-700 text-white flex items-center justify-center shrink-0">
          <ClipboardCheck size={13} />
        </div>
        <h3 className="text-[13px] font-semibold text-forest-900 flex-1">R&eacute;ponses cadrage li&eacute;es</h3>
        <span className="text-[11px] text-forest-700 font-medium">
          {answers.length} question{answers.length > 1 ? 's' : ''} du questionnaire client
        </span>
      </button>
      {open && (
        <ul className="px-4 py-3 space-y-2">
          {answers.map((ans) => {
            const cfg = WEIGHT_CFG[ans.weight] ?? WEIGHT_CFG[1]
            const formatted = formatResponse(ans.response_value)
            return (
              <li key={ans.question_id} className="text-[12px] text-gray-700 leading-relaxed flex items-start gap-2">
                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${cfg.color}`}>
                  {cfg.label}
                </span>
                <span className="flex-1 min-w-0">
                  <strong className="font-mono text-[11px] text-forest-700">{ans.question_code}</strong>
                  {ans.question_text && (
                    <span className="text-gray-600">{' '}&middot; {ans.question_text}</span>
                  )}
                  {' '}&mdash; <strong className="text-gray-900">{formatted}</strong>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
