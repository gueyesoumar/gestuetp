import { useMemo, useState } from 'react'
import { useVocab } from '../edition/useVocab'
import type { PortfolioOrg } from './useSupervisedPortfolio'
import { IicBadge, expColor } from './riskLabels'
import { ExpositionHelp } from './ExpositionHelp'
import { FilterBar } from '../../components/filters/FilterBar'
import { useFilters, type FilterDef } from '../../components/filters/useFilters'
import { Pagination, pageSlice } from '../../components/ui/Pagination'

const PAGE = 10
const postureOf = (max: number): 'eleve' | 'moyen' | 'faible' => (max >= 60 ? 'eleve' : max >= 30 ? 'moyen' : 'faible')
type SortKey = 'org_name' | 'scenario_count' | 'above_threshold' | 'overdue_reviews' | 'max_exposure' | 'pending_directives'

/** Table détaillée du portefeuille supervisé (filtre standard + tri + pagination). */
export function PortfolioTable({ orgs, onSelect }: { orgs: PortfolioOrg[]; onSelect: (o: PortfolioOrg) => void }): JSX.Element {
  const vocab = useVocab()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('max_exposure')
  const [page, setPage] = useState(1)

  const defs = useMemo<FilterDef[]>(() => {
    const secteurs = [...new Set(orgs.map((o) => o.sector).filter((s): s is string => !!s))].sort()
    return [
      { key: 'secteur', label: 'Secteur', type: 'select', options: secteurs.map((s) => ({ value: s, label: s })) },
      { key: 'type', label: 'Type', type: 'select', options: [{ value: 'iic', label: 'IIC' }, { value: 'std', label: 'Standard' }] },
    ]
  }, [orgs])
  const f = useFilters(defs)

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    return orgs.filter((o) => {
      if (n && !(o.org_name.toLowerCase().includes(n) || (o.sector ?? '').toLowerCase().includes(n))) return false
      if (f.values.secteur && o.sector !== f.values.secteur) return false
      if (f.values.type === 'iic' && !o.is_iic) return false
      if (f.values.type === 'std' && o.is_iic) return false
      return true
    })
  }, [orgs, q, f.values])
  const sorted = useMemo(() => [...filtered].sort((a, b) => (sort === 'org_name' ? a.org_name.localeCompare(b.org_name) : (b[sort] as number) - (a[sort] as number))), [filtered, sort])

  const dist = { eleve: 0, moyen: 0, faible: 0 }
  filtered.forEach((o) => { dist[postureOf(o.max_exposure)]++ })
  const pageRows = pageSlice(sorted, page, PAGE)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-2">Répartition par exposition maximale</h3>
        <DistBar label="Élevée (≥ 60)" count={dist.eleve} total={filtered.length} color="#C0392B" />
        <DistBar label="Moyenne (30-59)" count={dist.moyen} total={filtered.length} color="#B8860B" />
        <DistBar label="Faible (< 30)" count={dist.faible} total={filtered.length} color="#27AE60" />
      </div>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <FilterBar defs={defs} state={f} search={{ value: q, onChange: (v) => { setQ(v); setPage(1) }, placeholder: `Rechercher un ${vocab.entitySingular} ou un secteur...` }} />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="px-2 py-2 text-[12px] border border-gray-300 rounded-lg">
          <option value="max_exposure">Trier : exposition max</option>
          <option value="above_threshold">Trier : hors seuil</option>
          <option value="overdue_reviews">Trier : revues en retard</option>
          <option value="pending_directives">Trier : demandes en attente</option>
          <option value="scenario_count">Trier : nombre de risques</option>
          <option value="org_name">Trier : nom</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">{vocab.entitiesTitle}</th>
              <th className="text-left px-4 py-3 font-semibold">Type</th>
              <th className="text-left px-4 py-3 font-semibold">Secteur</th>
              <th className="text-right px-4 py-3 font-semibold">Risques</th>
              <th className="text-right px-4 py-3 font-semibold">Hors seuil</th>
              <th className="text-right px-4 py-3 font-semibold">Revues retard</th>
              <th className="text-right px-4 py-3 font-semibold"><span className="inline-flex items-center justify-end gap-1">Expo moy / max <ExpositionHelp /></span></th>
              <th className="text-right px-4 py-3 font-semibold">Demandes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((o) => (
              <tr key={o.organization_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(o)}>
                <td className="px-4 py-3 font-medium text-gray-900">{o.org_name}</td>
                <td className="px-4 py-3"><IicBadge iic={o.is_iic} /></td>
                <td className="px-4 py-3 text-gray-500">{o.sector ?? '-'}</td>
                <td className="px-4 py-3 text-right text-gray-600">{o.scenario_count}</td>
                <td className="px-4 py-3 text-right font-semibold" style={o.above_threshold > 0 ? { color: '#C0392B' } : undefined}>{o.above_threshold}</td>
                <td className="px-4 py-3 text-right font-semibold" style={o.overdue_reviews > 0 ? { color: '#C0392B' } : undefined}>{o.overdue_reviews}</td>
                <td className="px-4 py-3 text-right font-mono"><span className="text-gray-400">{o.avg_exposure}</span> <span className="text-gray-300">/</span> <span style={{ color: expColor(o.max_exposure) }} className="font-bold">{o.max_exposure}</span></td>
                <td className="px-4 py-3 text-right font-semibold" style={o.pending_directives > 0 ? { color: '#B8860B' } : undefined}>{o.pending_directives}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={sorted.length} page={page} pageSize={PAGE} onPage={setPage} />
      </div>
    </div>
  )
}

function DistBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }): JSX.Element {
  const pct = total ? Math.round((count / total) * 100) : 0
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center justify-between text-[12px] text-gray-500"><span>{label}</span><span className="font-mono">{count}</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  )
}
