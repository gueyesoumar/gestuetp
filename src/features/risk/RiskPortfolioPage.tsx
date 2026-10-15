import { useMemo, useState } from 'react'
import { Network, Search } from 'lucide-react'
import { useSupervisedPortfolio, type PortfolioOrg } from './useSupervisedPortfolio'
import { SupervisedOrgRisks } from './SupervisedOrgRisks'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { EmptyState } from '../../components/ui/EmptyState'

const PAGE_SIZE = 10
const expColor = (v: number): string => v >= 60 ? '#C0392B' : v >= 30 ? '#B8860B' : '#27AE60'
const postureOf = (max: number): 'eleve' | 'moyen' | 'faible' => max >= 60 ? 'eleve' : max >= 30 ? 'moyen' : 'faible'

type SortKey = 'org_name' | 'scenario_count' | 'above_threshold' | 'overdue_reviews' | 'max_exposure' | 'pending_directives'

/** Vue régulateur/cabinet : portefeuille de risque multi-org, scalable (RFC 0017 Lot C). */
export function RiskPortfolioPage(): JSX.Element {
  const { orgs, loading, error } = useSupervisedPortfolio()
  const [selected, setSelected] = useState<PortfolioOrg | null>(null)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('max_exposure')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase()
    const base = n ? orgs.filter((o) => o.org_name.toLowerCase().includes(n) || (o.sector ?? '').toLowerCase().includes(n)) : orgs
    return [...base].sort((a, b) => sort === 'org_name' ? a.org_name.localeCompare(b.org_name) : (b[sort] as number) - (a[sort] as number))
  }, [orgs, q, sort])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (selected) return <SupervisedOrgRisks org={selected} onBack={() => setSelected(null)} />

  const totals = {
    scenarios: orgs.reduce((s, o) => s + o.scenario_count, 0),
    aboveThreshold: orgs.reduce((s, o) => s + o.above_threshold, 0),
    overdue: orgs.reduce((s, o) => s + o.overdue_reviews, 0),
    pending: orgs.reduce((s, o) => s + o.pending_directives, 0),
  }
  const dist = { eleve: 0, moyen: 0, faible: 0 }
  orgs.forEach((o) => { dist[postureOf(o.max_exposure)]++ })
  const top5 = [...orgs].sort((a, b) => b.max_exposure - a.max_exposure).slice(0, 5)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Network size={20} className="text-[#E07A5F]" /> Portefeuille de risque</h1>
        <p className="mt-1 text-[13px] text-gray-500">Le risque de vos assujettis : suivez, demandez des actions de traitement et vérifiez leur réalisation.</p>
      </div>

      {orgs.length === 0 ? (
        <EmptyState title="Aucun assujetti supervisé" description="Vous n'avez pas de mission active vous donnant accès au registre de risque d'une autre organisation." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi value={orgs.length} label="Assujettis" />
            <Kpi value={totals.scenarios} label="Risques" />
            <Kpi value={totals.aboveThreshold} label="Hors seuil" tone={totals.aboveThreshold > 0 ? 'text-red-600' : undefined} />
            <Kpi value={totals.overdue} label="Revues en retard" tone={totals.overdue > 0 ? 'text-red-600' : undefined} />
            <Kpi value={totals.pending} label="Demandes en attente" tone={totals.pending > 0 ? 'text-amber-600' : undefined} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Répartition par exposition maximale</h3>
              <DistBar label="Élevée (≥ 60)" count={dist.eleve} total={orgs.length} color="#C0392B" />
              <DistBar label="Moyenne (30-59)" count={dist.moyen} total={orgs.length} color="#B8860B" />
              <DistBar label="Faible (< 30)" count={dist.faible} total={orgs.length} color="#27AE60" />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Assujettis les plus exposés</h3>
              <div className="space-y-1.5">
                {top5.map((o) => (
                  <button key={o.organization_id} onClick={() => setSelected(o)} className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-gray-50">
                    <span className="truncate text-gray-700">{o.org_name}</span>
                    <span className="font-bold shrink-0" style={{ color: expColor(o.max_exposure) }}>{o.max_exposure}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Rechercher un assujetti ou un secteur..." className="w-full pl-9 pr-3 py-2 text-[13px] border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700" />
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

          <PortfolioTable rows={pageRows} onSelect={setSelected} />

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 text-[13px]">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">Précédent</button>
              <span className="text-gray-500">Page {page + 1} / {pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40">Suivant</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Kpi({ value, label, tone }: { value: number; label: string; tone?: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className={`text-2xl font-bold ${tone ?? 'text-gray-900'}`}>{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
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

function PortfolioTable({ rows, onSelect }: { rows: PortfolioOrg[]; onSelect: (o: PortfolioOrg) => void }): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-[13px]">
        <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Assujetti</th>
            <th className="text-left px-4 py-3 font-semibold">Secteur</th>
            <th className="text-right px-4 py-3 font-semibold">Risques</th>
            <th className="text-right px-4 py-3 font-semibold">Hors seuil</th>
            <th className="text-right px-4 py-3 font-semibold">Revues retard</th>
            <th className="text-right px-4 py-3 font-semibold">Expo moy / max</th>
            <th className="text-right px-4 py-3 font-semibold">Demandes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((o) => (
            <tr key={o.organization_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(o)}>
              <td className="px-4 py-3 font-medium text-gray-900 hover:text-[#6D5AE6]">{o.org_name}</td>
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
    </div>
  )
}
