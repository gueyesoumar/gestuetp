import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import type { ReviewDue } from './usePilotage'

const fmt = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

/** Revues de conformité dues ou en retard (n°18 Lot 1). Affiché sur le cockpit Regul. */
export function ReviewsDuePanel({ items }: { items: ReviewDue[] }): JSX.Element {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <CalendarClock size={16} className="text-forest-700" />
        <h3 className="text-sm font-bold text-gray-900">Revues de conformité</h3>
        {items.length > 0 && (
          <span className="ml-auto rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-bold text-forest-700">{items.length}</span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-[12.5px] text-gray-500">Aucune revue due dans les 60 prochains jours.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.slice(0, 6).map((r) => (
            <li key={`${r.id}-${r.framework}`} className="py-2">
              <Link to={`/assujettis/${r.id}`} className="flex items-center justify-between gap-3 hover:text-forest-900">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-gray-900">{r.name}</p>
                  <p className="text-[11px] text-gray-500">{r.framework || 'Référentiel'} · {fmt(r.date)}</p>
                </div>
                <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${r.overdue ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                  {r.overdue ? 'En retard' : 'Bientôt'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
