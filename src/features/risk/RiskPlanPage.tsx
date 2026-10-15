import { useMemo, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { useRiskPlan } from './useRiskTreatment'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { RISK_ACTION_STATUS } from '../../lib/constants'
import type { RiskActionStatus } from '../../types/database.types'

const statusLabel = (v: string): string => RISK_ACTION_STATUS.find((s) => s.value === v)?.label ?? v
const statusCls: Record<RiskActionStatus, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-amber-50 text-amber-700',
  done: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-50 text-gray-400 line-through',
}
const isOverdue = (due: string | null, status: string): boolean =>
  !!due && status !== 'done' && status !== 'cancelled' && due < new Date().toISOString().slice(0, 10)

type Filter = 'all' | 'internal' | 'supervisor_directive' | 'overdue' | RiskActionStatus

/** Plan de traitement consolidé : toutes les actions du registre (RFC 0017 Lot 2). */
export function RiskPlanPage(): JSX.Element {
  const { rows, loading, error } = useRiskPlan()
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => rows.filter((r) => {
    if (filter === 'all') return true
    if (filter === 'overdue') return isOverdue(r.due_date, r.status)
    if (filter === 'internal' || filter === 'supervisor_directive') return r.origin === filter
    return r.status === filter
  }), [rows, filter])

  const done = rows.filter((r) => r.status === 'done').length
  const active = rows.filter((r) => r.status !== 'cancelled').length
  const pct = active ? Math.round((done / active) * 100) : 0

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const chips: { k: Filter; label: string }[] = [
    { k: 'all', label: `Toutes (${rows.length})` },
    { k: 'internal', label: 'Internes' },
    { k: 'supervisor_directive', label: 'Demandes du régulateur' },
    { k: 'in_progress', label: 'En cours' },
    { k: 'overdue', label: `En retard (${rows.filter((r) => isOverdue(r.due_date, r.status)).length})` },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ListChecks size={20} className="text-[#E07A5F]" /> Plan de traitement</h1>
          <p className="mt-1 text-[13px] text-gray-500">Toutes les actions de traitement du registre (internes et demandes du régulateur).</p>
        </div>
        <div className="min-w-[160px]">
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-forest-600 rounded-full" style={{ width: `${pct}%` }} /></div>
          <div className="text-[11px] text-gray-400 mt-1 text-right">{done}/{active} terminées · {pct}%</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {chips.map((c) => (
          <button key={c.k} onClick={() => setFilter(c.k)}
            className={`text-[12px] font-medium px-3 py-1 rounded-full border ${filter === c.k ? 'bg-forest-50 border-forest-200 text-forest-700' : 'border-gray-200 text-gray-500 hover:border-forest-300'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucune action" description="Les actions de traitement créées sur les scénarios apparaîtront ici." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Risque</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Contrôle</th>
                <th className="text-left px-4 py-3 font-semibold">Origine</th>
                <th className="text-left px-4 py-3 font-semibold">Échéance</th>
                <th className="text-left px-4 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{r.scenario_title ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-900">{r.description}</td>
                  <td className="px-4 py-3 font-mono text-gray-500">{r.control_code ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${r.origin === 'supervisor_directive' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.origin === 'supervisor_directive' ? 'Régulateur' : 'Interne'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={isOverdue(r.due_date, r.status) ? 'text-red-600 font-semibold' : 'text-gray-500'}>{r.due_date ?? '-'}</span>
                  </td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusCls[r.status]}`}>{statusLabel(r.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
