import { useEffect, useState } from 'react'
import { Table2, LayoutGrid } from 'lucide-react'
import type { SubsidiaryRow } from './useSubsidiaries'
import { SubsidiaryCard } from './SubsidiaryCard'
import { SubsidiaryTable } from './SubsidiaryTable'
import { Pagination, pageSlice } from '../../components/ui/Pagination'

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

/** Résultats du registre : bascule Tableau / Cartes (préférence mémorisée),
 * rendu et pagination. Cartes par défaut. */
export function SubsidiaryResults({ rows, isRegul, routeBase, parentNameOf, onEdit, onDeactivate }: Props): JSX.Element {
  const [view, setView] = useState<View>(readView)
  const [page, setPage] = useState(1)
  useEffect(() => { setPage(1) }, [rows])

  const setAndStore = (v: View): void => {
    setView(v)
    try { localStorage.setItem(STORE_KEY, v) } catch { /* indisponible : préférence non mémorisée */ }
  }

  const paged = pageSlice(rows, page, PAGE_SIZE)
  const btn = (v: View, label: string, Icon: typeof Table2): JSX.Element => (
    <button onClick={() => setAndStore(v)} aria-pressed={view === v}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors ${view === v ? 'bg-white text-forest-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
      <Icon size={14} /> {label}
    </button>
  )

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {btn('cards', 'Cartes', LayoutGrid)}
          {btn('table', 'Tableau', Table2)}
        </div>
      </div>

      {view === 'cards' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map((s) => (
            <SubsidiaryCard key={s.id} subsidiary={s} parentName={parentNameOf(s)} onEdit={onEdit} onDeactivate={onDeactivate} />
          ))}
        </div>
      ) : (
        <SubsidiaryTable rows={paged} isRegul={isRegul} routeBase={routeBase} onEdit={onEdit} onDeactivate={onDeactivate} />
      )}

      <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onPage={setPage} />
    </div>
  )
}
