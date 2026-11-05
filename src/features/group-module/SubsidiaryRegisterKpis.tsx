import { useMemo } from 'react'
import type { SubsidiaryRow } from './useSubsidiaries'

/**
 * Synthèse compacte du registre, RECALCULÉE sur la sélection filtrée courante
 * (pas les totaux globaux : ceux-là vivent sur le tableau de bord). Indicateurs
 * régulateur-natifs : volume, conformité faible (score clos < 60%), couverture
 * (jamais évalués) et obligation de revue en retard. Tout dérivé de SubsidiaryRow
 * (zéro requête nouvelle). `conformité faible` exclut les non évalués (score null),
 * qui relèvent de « Non contrôlés » : deux angles morts complémentaires.
 */
export function SubsidiaryRegisterKpis({ rows, entityLabel }: { rows: SubsidiaryRow[]; entityLabel: string }): JSX.Element {
  const { count, lowConf, uncontrolled, reviewLate } = useMemo(() => {
    const now = Date.now()
    return {
      count: rows.length,
      lowConf: rows.filter((s) => s.conformityScore !== null && s.conformityScore < 60).length,
      uncontrolled: rows.filter((s) => s.activeMissions === 0 && s.closedMissions === 0).length,
      reviewLate: rows.filter((s) => s.reviewCycle !== null && new Date(s.reviewCycle.date).getTime() < now).length,
    }
  }, [rows])

  const tiles: { label: string; value: string; tone: string }[] = [
    { label: entityLabel, value: String(count), tone: 'text-gray-900' },
    { label: 'Conformité faible', value: String(lowConf), tone: lowConf > 0 ? 'text-red-600' : 'text-gray-900' },
    { label: 'Non contrôlés', value: String(uncontrolled), tone: uncontrolled > 0 ? 'text-gold-600' : 'text-gray-900' },
    { label: 'Revues en retard', value: String(reviewLate), tone: reviewLate > 0 ? 'text-red-600' : 'text-gray-900' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t.label}</p>
          <p className={`mt-0.5 text-[22px] font-bold tabular-nums ${t.tone}`}>{t.value}</p>
        </div>
      ))}
    </div>
  )
}
