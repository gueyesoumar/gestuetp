import { useMemo } from 'react'
import type { SubsidiaryRow } from './useSubsidiaries'

/**
 * Synthèse compacte du registre, RECALCULÉE sur la sélection filtrée courante
 * (pas les totaux globaux : ceux-là vivent sur le tableau de bord). Réactivité au
 * filtre = la synthèse répond « à quoi ressemble mon sous-ensemble », sans
 * dupliquer le dashboard. IIC (criticality='eleve') n'a de sens qu'en Regul.
 */
export function SubsidiaryRegisterKpis({ rows, isRegul }: { rows: SubsidiaryRow[]; isRegul: boolean }): JSX.Element {
  const { shown, iic, overdue, avg } = useMemo(() => {
    const scored = rows.filter((s) => s.conformityScore !== null)
    return {
      shown: rows.length,
      iic: rows.filter((s) => s.regulatoryProfile?.criticality === 'eleve').length,
      overdue: rows.filter((s) => s.overdueCount > 0).length,
      avg: scored.length ? Math.round(scored.reduce((a, s) => a + (s.conformityScore as number), 0) / scored.length) : null,
    }
  }, [rows])

  const tiles: { label: string; value: string; tone: string }[] = [
    { label: 'Affichés', value: String(shown), tone: 'text-gray-900' },
    ...(isRegul ? [{ label: 'Dont IIC', value: String(iic), tone: 'text-forest-700' }] : []),
    { label: 'Score moyen', value: avg === null ? '-' : `${avg}%`, tone: 'text-gray-900' },
    { label: 'Plans en retard', value: String(overdue), tone: overdue > 0 ? 'text-red-600' : 'text-gray-900' },
  ]

  return (
    <div className={`grid grid-cols-2 gap-3 ${tiles.length >= 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t.label}</p>
          <p className={`mt-0.5 text-[22px] font-bold tabular-nums ${t.tone}`}>{t.value}</p>
        </div>
      ))}
    </div>
  )
}
