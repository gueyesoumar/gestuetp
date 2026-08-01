import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTransversalPlans, type TransversalCAR } from './useTransversalPlans'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ActionPlanFilters, applyFilters, type ActionPlanFilterState } from '../missions/action-plan/ActionPlanFilters'

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  open: { label: 'Ouvert', color: 'text-amber-700 bg-amber-50' },
  client_responded: { label: 'À vérifier', color: 'text-blue-700 bg-blue-50' },
  verified: { label: 'Vérifié', color: 'text-green-700 bg-green-50' },
  closed: { label: 'Clôturé', color: 'text-gray-500 bg-gray-100' },
}

const CLASS_BADGES: Record<string, { label: string; color: string }> = {
  major_nc: { label: 'NC Maj.', color: 'text-red-700 bg-red-50' },
  minor_nc: { label: 'NC Min.', color: 'text-orange-700 bg-orange-50' },
  observation: { label: 'Obs.', color: 'text-blue-700 bg-blue-50' },
}

function formatShortDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function isOverdue(c: TransversalCAR): boolean {
  if (c.status === 'verified' || c.status === 'closed') return false
  const due = c.client_target_date ?? c.deadline
  if (!due) return false
  return new Date(due).getTime() < Date.now()
}

export function TransversalPlansPage(): JSX.Element {
  const { cars, loading, totalOpen, totalToVerify, totalOverdue, totalClosed } = useTransversalPlans()
  const [filters, setFilters] = useState<ActionPlanFilterState>({ status: 'all', classification: 'all', search: '' })

  const filtered = useMemo(() => applyFilters(cars, filters), [cars, filters])

  if (loading) return <LoadingSpinner />

  if (cars.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Plans d&apos;action transverses</h2>
        <p className="mt-1 text-[13px] text-gray-500">Suivi consolidé des actions correctives sur toutes les filiales du groupe.</p>
        <div className="mt-8">
          <EmptyState
            title="Aucune action corrective"
            description="Les actions correctives apparaîtront ici dès qu'une mission ou un cycle de supervision en aura généré."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Plans d&apos;action transverses</h2>
        <p className="mt-1 text-[13px] text-gray-500">
          {cars.length} action{cars.length > 1 ? 's' : ''} corrective{cars.length > 1 ? 's' : ''} consolidée{cars.length > 1 ? 's' : ''} sur l&apos;ensemble du groupe.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KPI label="Ouvertes" value={totalOpen} color="text-amber-700" bg="bg-amber-50 border-amber-200" />
        <KPI label="À vérifier" value={totalToVerify} color="text-blue-700" bg="bg-blue-50 border-blue-200" />
        <KPI label="En retard" value={totalOverdue} color="text-red-700" bg="bg-red-50 border-red-300" />
        <KPI label="Clôturées" value={totalClosed} color="text-green-700" bg="bg-green-50 border-green-200" />
      </div>

      <ActionPlanFilters state={filters} onChange={setFilters} />

      {filtered.length === 0 ? (
        <EmptyState title="Aucun résultat" description="Aucune action ne correspond aux filtres." />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Code</th>
                <th className="text-left px-4 py-3 font-semibold">Filiale</th>
                <th className="text-left px-4 py-3 font-semibold">Mission</th>
                <th className="text-left px-4 py-3 font-semibold">Contrôle</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Échéance</th>
                <th className="text-left px-4 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[13px]">
              {filtered.map((c) => {
                const cls = CLASS_BADGES[c.finding_classification] ?? { label: c.finding_classification, color: 'text-gray-500 bg-gray-50' }
                const st = STATUS_BADGES[c.status] ?? STATUS_BADGES.open
                const overdue = isOverdue(c)
                const due = c.client_target_date ?? c.deadline
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-forest-700">{c.code}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.subsidiary_id ? (
                        <Link to={`/filiales/${c.subsidiary_id}`} className="hover:text-forest-700 hover:underline">
                          {c.subsidiary_name}
                        </Link>
                      ) : (c.subsidiary_name ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      <Link to={`/missions/${c.mission_id}`} className="text-gray-700 hover:text-forest-700 hover:underline">
                        {c.mission_name ?? '—'}
                      </Link>
                      {c.mission_kind === 'continuous_supervision' && (
                        <span className="ml-1.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">↻</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.control_code && <span className="font-mono text-[12px] font-semibold">{c.control_code}</span>}
                      {c.control_name && <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[220px]">{c.control_name}</p>}
                    </td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${cls.color}`}>{cls.label}</span></td>
                    <td className="px-4 py-3 text-xs">
                      <span className={overdue ? 'text-red-700 font-semibold' : 'text-gray-700'}>{formatShortDate(due)}</span>
                      {overdue && <span className="ml-1.5 text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">RETARD</span>}
                    </td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function KPI({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }): JSX.Element {
  return (
    <div className={`rounded-xl border p-4 text-center ${bg}`}>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] font-medium text-gray-500 mt-1">{label}</p>
    </div>
  )
}
