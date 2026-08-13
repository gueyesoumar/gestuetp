import { useMemo, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { useActivityLog, actorName, type ActivityFilters, type ActivityRow } from './useActivityLog'
import { ActivityItem, FAMILY_META } from './ActivityItem'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'

const FAMILIES = [{ key: '', label: 'Toutes les familles' }, ...Object.entries(FAMILY_META).map(([key, m]) => ({ key, label: m.label }))]

function toCsv(rows: ActivityRow[]): string {
  const esc = (s: unknown): string => `"${String(s ?? '').replace(/"/g, '""')}"`
  const head = ['Date', 'Acteur', 'Action', 'Cible', 'Résumé']
  const lines = rows.map((r) => [r.occurred_at, actorName(r), r.action, r.target_label ?? '', r.summary ?? ''].map(esc).join(','))
  return [head.map(esc).join(','), ...lines].join('\n')
}

export function AuditTrailPage(): JSX.Element {
  const [filters, setFilters] = useState<ActivityFilters>({ family: '', from: '', to: '' })
  const [search, setSearch] = useState('')
  const { rows, loading, error, hasMore, loadMore } = useActivityLog(filters)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      (r.summary ?? '').toLowerCase().includes(q) ||
      (r.target_label ?? '').toLowerCase().includes(q) ||
      r.action.toLowerCase().includes(q) ||
      actorName(r).toLowerCase().includes(q))
  }, [rows, search])

  const exportCsv = (): void => {
    const blob = new Blob([`﻿${toCsv(visible)}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `piste-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const field = 'px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Piste d&apos;audit</h1>
        <p className="mt-1 text-[13px] text-gray-500">Historique inaltérable des actions réalisées dans votre organisation. Chaînage cryptographique par organisation.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select value={filters.family} onChange={(e) => setFilters((f) => ({ ...f, family: e.target.value }))} className={`${field} w-52`}>
          {FAMILIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} className={field} aria-label="Depuis" />
        <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} className={field} aria-label="Jusqu&apos;à" />
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher&hellip;" className={`${field} w-56 pl-9`} />
        </div>
        <div className="flex-1" />
        <button onClick={exportCsv} disabled={visible.length === 0} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      {loading && rows.length === 0 ? (
        <LoadingSpinner />
      ) : visible.length === 0 ? (
        <EmptyState title="Aucune activité" description="Aucune action enregistrée pour ces critères." />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-1">
          {visible.map((r) => <ActivityItem key={r.id} row={r} />)}
        </div>
      )}

      {hasMore && !search && (
        <div className="flex justify-center">
          <button onClick={loadMore} disabled={loading} className="px-4 py-2 text-sm font-medium text-forest-700 border border-forest-200 rounded-lg hover:bg-forest-50 disabled:opacity-50">
            {loading ? 'Chargement…' : 'Charger plus'}
          </button>
        </div>
      )}
    </div>
  )
}
