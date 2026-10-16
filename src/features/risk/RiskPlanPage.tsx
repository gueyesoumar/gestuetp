import { useMemo, useState } from 'react'
import { ListChecks } from 'lucide-react'
import { useRiskPlan, type PlanRow } from './useRiskTreatment'
import { useEdition } from '../edition/EditionContext'
import { useVocab } from '../edition/useVocab'
import { useSupervisedPlan, type SupervisedPlanRow } from './useSupervisedPortfolio'
import { IicBadge } from './riskLabels'
import { FilterBar } from '../../components/filters/FilterBar'
import { useFilters, type FilterDef } from '../../components/filters/useFilters'
import { Pagination, pageSlice } from '../../components/ui/Pagination'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { RISK_ACTION_STATUS } from '../../lib/constants'
import type { RiskActionStatus } from '../../types/database.types'

const PAGE = 10
const statusLabel = (v: string): string => RISK_ACTION_STATUS.find((s) => s.value === v)?.label ?? v
const statusCls: Record<RiskActionStatus, string> = {
  todo: 'bg-gray-100 text-gray-600', in_progress: 'bg-amber-50 text-amber-700',
  done: 'bg-green-50 text-green-700', cancelled: 'bg-gray-50 text-gray-400 line-through',
}
const isOverdue = (due: string | null, status: string): boolean =>
  !!due && status !== 'done' && status !== 'cancelled' && due < new Date().toISOString().slice(0, 10)
type Row = PlanRow | SupervisedPlanRow

/** Plan de traitement : propre à l'org, ou consolidé cross-org (filtre standard + pagination). */
export function RiskPlanPage(): JSX.Element {
  const own = useRiskPlan()
  const { hasCapability } = useEdition()
  const vocab = useVocab()
  const supervises = hasCapability('supervision') || hasCapability('client_portal')
  const [scope, setScope] = useState<'own' | 'all'>(supervises ? 'all' : 'own')
  const sup = useSupervisedPlan()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const consolidated = supervises && scope === 'all'
  const rows: Row[] = consolidated ? sup.rows : own.rows
  const loading = consolidated ? sup.loading : own.loading
  const error = consolidated ? sup.error : own.error

  const defs = useMemo<FilterDef[]>(() => {
    const base: FilterDef[] = [
      { key: 'origine', label: 'Origine', type: 'select', options: [{ value: 'internal', label: 'Interne' }, { value: 'supervisor_directive', label: 'Régulateur' }] },
      { key: 'statut', label: 'Statut', type: 'select', options: RISK_ACTION_STATUS.map((s) => ({ value: s.value, label: s.label })) },
      { key: 'retard', label: 'En retard', type: 'toggle' },
    ]
    if (!consolidated) return base
    const secteurs = [...new Set(sup.rows.map((r) => r.org_sector).filter((s): s is string => !!s))].sort()
    return [
      { key: 'secteur', label: 'Secteur', type: 'select', options: secteurs.map((s) => ({ value: s, label: s })) },
      { key: 'type', label: 'Type', type: 'select', options: [{ value: 'iic', label: 'IIC' }, { value: 'std', label: 'Standard' }] },
      ...base,
    ]
  }, [consolidated, sup.rows])
  const f = useFilters(defs)

  const filtered = useMemo(() => rows.filter((r) => {
    const n = q.trim().toLowerCase()
    if (n && !((r.scenario_title ?? '').toLowerCase().includes(n) || r.description.toLowerCase().includes(n) || (consolidated && (r as SupervisedPlanRow).org_name.toLowerCase().includes(n)))) return false
    if (f.values.origine && r.origin !== f.values.origine) return false
    if (f.values.statut && r.status !== f.values.statut) return false
    if (f.values.retard && !isOverdue(r.due_date, r.status)) return false
    if (consolidated) {
      const rr = r as SupervisedPlanRow
      if (f.values.secteur && rr.org_sector !== f.values.secteur) return false
      if (f.values.type === 'iic' && !rr.org_is_iic) return false
      if (f.values.type === 'std' && rr.org_is_iic) return false
    }
    return true
  }), [rows, q, f.values, consolidated])

  const done = rows.filter((r) => r.status === 'done').length
  const active = rows.filter((r) => r.status !== 'cancelled').length
  const pct = active ? Math.round((done / active) * 100) : 0

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  const pageRows = pageSlice(filtered, page, PAGE)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ListChecks size={20} className="text-[#E07A5F]" /> Plan de traitement</h1>
          <p className="mt-1 text-[13px] text-gray-500">{consolidated ? `Actions de traitement de l'ensemble de vos ${vocab.entityPlural} (internes et demandes du régulateur).` : 'Toutes les actions de traitement du registre (internes et demandes du régulateur).'}</p>
        </div>
        <div className="min-w-[160px]">
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-forest-600 rounded-full" style={{ width: `${pct}%` }} /></div>
          <div className="text-[11px] text-gray-400 mt-1 text-right">{done}/{active} terminées · {pct}%</div>
        </div>
      </div>

      {supervises && (
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-[13px] font-semibold">
          <button onClick={() => { setScope('all'); f.reset(); setPage(1) }} className={`px-3 py-1.5 ${consolidated ? 'bg-forest-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Tous les {vocab.entityPlural}</button>
          <button onClick={() => { setScope('own'); f.reset(); setPage(1) }} className={`px-3 py-1.5 border-l border-gray-200 ${!consolidated ? 'bg-forest-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>Mon organisation</button>
        </div>
      )}

      <FilterBar defs={defs} state={f} search={{ value: q, onChange: (v) => { setQ(v); setPage(1) }, placeholder: 'Rechercher un risque, une action...' }} />

      {filtered.length === 0 ? (
        <EmptyState title="Aucune action" description="Aucune action de traitement ne correspond à ces filtres." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
              <tr>
                {consolidated && <th className="text-left px-4 py-3 font-semibold">{vocab.entitiesTitle}</th>}
                {consolidated && <th className="text-left px-4 py-3 font-semibold">Type</th>}
                {consolidated && <th className="text-left px-4 py-3 font-semibold">Secteur</th>}
                <th className="text-left px-4 py-3 font-semibold">Risque</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Origine</th>
                <th className="text-left px-4 py-3 font-semibold">Échéance</th>
                <th className="text-left px-4 py-3 font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageRows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  {consolidated && <td className="px-4 py-3 font-medium text-gray-900">{(r as SupervisedPlanRow).org_name}</td>}
                  {consolidated && <td className="px-4 py-3"><IicBadge iic={(r as SupervisedPlanRow).org_is_iic} /></td>}
                  {consolidated && <td className="px-4 py-3 text-gray-500">{(r as SupervisedPlanRow).org_sector ?? '-'}</td>}
                  <td className="px-4 py-3 text-gray-700">{r.scenario_title ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-900">{r.description}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${r.origin === 'supervisor_directive' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{r.origin === 'supervisor_directive' ? 'Régulateur' : 'Interne'}</span></td>
                  <td className="px-4 py-3"><span className={isOverdue(r.due_date, r.status) ? 'text-red-600 font-semibold' : 'text-gray-500'}>{r.due_date ?? '-'}</span></td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${statusCls[r.status as RiskActionStatus]}`}>{statusLabel(r.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination total={filtered.length} page={page} pageSize={PAGE} onPage={setPage} />
        </div>
      )}
    </div>
  )
}
