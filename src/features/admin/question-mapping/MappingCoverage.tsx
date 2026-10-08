import { useMemo, useState } from 'react'
import type { CoverageRow } from './useQuestionMapping'

type Filter = 'all' | 'uncovered' | 'context' | 'critical'
const CRITICAL_RISK = 4

const BADGE: Record<number, { label: string; cls: string }> = {
  0: { label: 'Non couvert', cls: 'bg-red-50 text-red-600' },
  1: { label: 'Contexte seul', cls: 'bg-amber-50 text-amber-700' },
  2: { label: 'Partiel', cls: 'bg-gold-50 text-gold-600' },
  3: { label: 'Preuve forte', cls: 'bg-forest-50 text-forest-700' },
}

/** Vue orientée contrôle : débusque les zones aveugles du cadrage. */
export function MappingCoverage({ rows }: { rows: CoverageRow[] }) {
  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(() => ({
    uncovered: rows.filter((r) => r.bestWeight === 0).length,
    context: rows.filter((r) => r.bestWeight === 1).length,
    critical: rows.filter((r) => (r.control.risk_level ?? 0) >= CRITICAL_RISK && r.bestWeight < 3).length,
  }), [rows])

  const shown = rows.filter((r) => {
    if (filter === 'uncovered') return r.bestWeight === 0
    if (filter === 'context') return r.bestWeight === 1
    if (filter === 'critical') return (r.control.risk_level ?? 0) >= CRITICAL_RISK && r.bestWeight < 3
    return true
  })

  const chips: { k: Filter; label: string }[] = [
    { k: 'all', label: `Tous (${rows.length})` },
    { k: 'uncovered', label: `Non couverts (${counts.uncovered})` },
    { k: 'context', label: `Contexte seul (${counts.context})` },
    { k: 'critical', label: `Critiques sans preuve forte (${counts.critical})` },
  ]

  return (
    <div className="p-4">
      <div className="flex gap-2 flex-wrap mb-3">
        {chips.map((c) => (
          <button key={c.k} type="button" onClick={() => setFilter(c.k)}
            className={`text-[11.5px] px-3 py-1.5 rounded-full border ${filter === c.k ? 'bg-forest-700 border-forest-700 text-white' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wide text-gray-400">
              <th className="text-left font-semibold px-2.5 py-1.5 border-b border-gray-200">Contrôle</th>
              <th className="text-left font-semibold px-2.5 py-1.5 border-b border-gray-200">Intitulé</th>
              <th className="text-left font-semibold px-2.5 py-1.5 border-b border-gray-200">Questions</th>
              <th className="text-left font-semibold px-2.5 py-1.5 border-b border-gray-200">État</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const crit = (r.control.risk_level ?? 0) >= CRITICAL_RISK
              const b = BADGE[r.bestWeight] ?? BADGE[0]
              return (
                <tr key={r.control.id} className={r.bestWeight === 0 ? 'bg-red-50/40' : ''}>
                  <td className="px-2.5 py-2 border-b border-gray-50 font-mono font-bold text-forest-700 whitespace-nowrap">{r.control.code}</td>
                  <td className="px-2.5 py-2 border-b border-gray-50 text-gray-700">
                    {r.control.name}
                    {crit && <span className="ml-1.5 text-[9px] font-extrabold uppercase text-red-600 tracking-wide">critique</span>}
                  </td>
                  <td className="px-2.5 py-2 border-b border-gray-50 text-gray-500 font-mono">{r.questionCount}</td>
                  <td className="px-2.5 py-2 border-b border-gray-50"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span></td>
                </tr>
              )
            })}
            {shown.length === 0 && (
              <tr><td colSpan={4} className="px-2.5 py-6 text-center text-[12px] text-gray-400 italic">Aucun contrôle dans ce filtre.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
