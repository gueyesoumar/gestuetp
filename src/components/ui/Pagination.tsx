import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Pagination standard de la plateforme : la liste ne dépasse jamais la page. */
export function Pagination({ total, page, pageSize, onPage }: {
  total: number; page: number; pageSize: number; onPage: (p: number) => void
}): JSX.Element | null {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  const from = total ? (page - 1) * pageSize + 1 : 0
  const to = Math.min(total, page * pageSize)
  const btn = 'min-w-[30px] h-[30px] px-1 inline-grid place-items-center border rounded-lg text-[12.5px] font-semibold disabled:opacity-40'

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 flex-wrap">
      <span className="text-[12px] text-gray-400">{from}-{to} sur {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(page - 1)} disabled={page === 1} className={`${btn} border-gray-200 text-gray-600 bg-white`} aria-label="Précédent"><ChevronLeft size={15} /></button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => onPage(p)} className={`${btn} ${p === page ? 'bg-forest-700 text-white border-forest-700' : 'border-gray-200 text-gray-600 bg-white'}`}>{p}</button>
        ))}
        <button onClick={() => onPage(page + 1)} disabled={page === pages} className={`${btn} border-gray-200 text-gray-600 bg-white`} aria-label="Suivant"><ChevronRight size={15} /></button>
      </div>
    </div>
  )
}

/** Fenêtre [from, to) d'une page (utilitaire). */
export function pageSlice<T>(rows: T[], page: number, pageSize: number): T[] {
  return rows.slice((page - 1) * pageSize, page * pageSize)
}
