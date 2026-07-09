import type { RiskItem } from './usePilotage'

const CRIT_ROWS: { key: string; label: string }[] = [
  { key: 'oiv', label: 'OIV' },
  { key: 'non_oiv', label: 'Non-OIV' },
  { key: 'unknown', label: 'Indéterminé' },
]

// Bandes de conformité, de la pire à la meilleure.
const BANDS: { key: string; label: string; test: (s: number | null) => boolean; tone: string }[] = [
  { key: 'crit', label: 'Critique\n< 40%', test: (s) => s !== null && s < 40, tone: 'bg-red-50 text-red-700' },
  { key: 'part', label: 'Partielle\n40–79%', test: (s) => s !== null && s >= 40 && s < 80, tone: 'bg-amber-50 text-amber-700' },
  { key: 'ok', label: 'Conforme\n≥ 80%', test: (s) => s !== null && s >= 80, tone: 'bg-green-50 text-green-700' },
  { key: 'na', label: 'Non évalué', test: (s) => s === null, tone: 'bg-gray-50 text-gray-500' },
]

/** Matrice criticité × conformité — les OIV non conformes sont mis en évidence. */
export function PilotageRiskMap({ items }: { items: RiskItem[] }): JSX.Element {
  const count = (crit: string, bandTest: (s: number | null) => boolean): number =>
    items.filter((i) => i.criticality === crit && bandTest(i.score)).length

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-1">Cartographie des risques</h3>
      <p className="text-[12px] text-gray-500 mb-4">Criticité &times; conformité. Priorité au coin haut-gauche (OIV peu conformes).</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-center">
          <thead>
            <tr>
              <th className="w-24"></th>
              {BANDS.map((b) => (
                <th key={b.key} className="p-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-pre-line">{b.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRIT_ROWS.map((row) => (
              <tr key={row.key}>
                <td className="p-2 text-[11px] font-bold text-gray-700 text-right pr-3">{row.label}</td>
                {BANDS.map((b) => {
                  const n = count(row.key, b.test)
                  const priority = row.key === 'oiv' && (b.key === 'crit' || b.key === 'part') && n > 0
                  return (
                    <td key={b.key} className="p-1.5">
                      <div className={`rounded-lg py-3 font-bold text-lg ${b.tone} ${priority ? 'ring-2 ring-red-500' : ''} ${n === 0 ? 'opacity-40' : ''}`}>
                        {n}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
