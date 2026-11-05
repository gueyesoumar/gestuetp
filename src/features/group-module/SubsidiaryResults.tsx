import { useEffect, useMemo, useState } from 'react'
import { Table2, LayoutGrid, Download, X } from 'lucide-react'
import type { SubsidiaryRow } from './useSubsidiaries'
import { SubsidiaryCard } from './SubsidiaryCard'
import { SubsidiaryTable } from './SubsidiaryTable'
import { buildSubsidiaryCsv } from './subsidiaryHelpers'
import { Pagination, pageSlice } from '../../components/ui/Pagination'
import { downloadCsv } from '../../lib/downloadCsv'

type View = 'cards' | 'table'
const PAGE_SIZE = 12
const STORE_KEY = 'subsidiaries-view'

interface Props {
  rows: SubsidiaryRow[]
  isRegul: boolean
  routeBase: string
  parentNameOf: (s: SubsidiaryRow) => string | null
  onEdit?: (s: SubsidiaryRow) => void
  onDeactivate?: (s: SubsidiaryRow) => void
}

const readView = (): View => {
  try { return localStorage.getItem(STORE_KEY) === 'table' ? 'table' : 'cards' } catch { return 'cards' }
}

/** Résultats du registre : bascule Tableau / Cartes (mémorisée), sélection en lot
 * (tableau) + export CSV, et pagination. Cartes par défaut. */
export function SubsidiaryResults({ rows, isRegul, routeBase, parentNameOf, onEdit, onDeactivate }: Props): JSX.Element {
  const [view, setView] = useState<View>(readView)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  useEffect(() => { setPage(1); setSelected(new Set()) }, [rows])

  const setAndStore = (v: View): void => {
    setView(v)
    if (v === 'cards') setSelected(new Set())
    try { localStorage.setItem(STORE_KEY, v) } catch { /* indisponible : préférence non mémorisée */ }
  }

  const paged = pageSlice(rows, page, PAGE_SIZE)
  const allChecked = paged.length > 0 && paged.every((s) => selected.has(s.id))
  const toggle = (id: string): void => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const toggleAll = (checked: boolean): void => setSelected((prev) => { const n = new Set(prev); paged.forEach((s) => (checked ? n.add(s.id) : n.delete(s.id))); return n })
  const selectedRows = useMemo(() => rows.filter((s) => selected.has(s.id)), [rows, selected])

  const exportCsv = (data: SubsidiaryRow[]): void => {
    const slug = routeBase.replace(/^\//, '') || 'entites'
    downloadCsv(`registre-${slug}-${new Date().toISOString().slice(0, 10)}.csv`, buildSubsidiaryCsv(data, isRegul))
  }

  const btn = (v: View, label: string, Icon: typeof Table2): JSX.Element => (
    <button onClick={() => setAndStore(v)} aria-pressed={view === v}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors ${view === v ? 'bg-white text-forest-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
      <Icon size={14} /> {label}
    </button>
  )

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button onClick={() => exportCsv(rows)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-[12.5px] font-semibold text-gray-600 transition-colors hover:border-forest-300 hover:bg-forest-50 hover:text-forest-700">
          <Download size={14} /> Exporter
        </button>
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {btn('cards', 'Cartes', LayoutGrid)}
          {btn('table', 'Tableau', Table2)}
        </div>
      </div>

      {view === 'table' && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg bg-forest-700 px-4 py-2.5 text-white">
          <span className="text-[13px] font-bold">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
          <button onClick={() => exportCsv(selectedRows)} className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold hover:bg-white/20">
            <Download size={14} /> Exporter la sélection
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-white/80 hover:text-white">
            <X size={14} /> Annuler
          </button>
        </div>
      )}

      {view === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((s) => (
            <SubsidiaryCard key={s.id} subsidiary={s} parentName={parentNameOf(s)} onEdit={onEdit} onDeactivate={onDeactivate} />
          ))}
        </div>
      ) : (
        <SubsidiaryTable rows={paged} isRegul={isRegul} routeBase={routeBase} onEdit={onEdit} onDeactivate={onDeactivate}
          selected={selected} allChecked={allChecked} onToggle={toggle} onToggleAll={toggleAll} />
      )}

      <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  )
}
