import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { Priority } from './usePilotage'

/** File de priorisation : où le régulateur doit agir en premier. */
export function PilotagePriorityList({ items }: { items: Priority[] }): JSX.Element {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-1">À traiter en priorité</h3>
      <p className="text-[12px] text-gray-500 mb-4">Assujettis nécessitant une action du régulateur.</p>
      {items.length === 0 ? (
        <p className="text-[13px] text-gray-400 py-6 text-center">Aucune action prioritaire — le parc est sous contrôle.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.slice(0, 12).map((p) => (
            <li key={`${p.id}-${p.reason}`}>
              <Link to={`/assujettis/${p.id}`} className="group flex items-center gap-3 py-2.5 hover:bg-forest-50/40 -mx-2 px-2 rounded-lg">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-gray-900 truncate">{p.name}</span>
                  <span className="block text-[11px] text-gray-500">{p.reason}</span>
                </span>
                <ArrowRight size={15} className="text-gray-300 group-hover:text-forest-700 transition shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {items.length > 12 && <p className="text-[11px] text-gray-400 mt-3">+ {items.length - 12} autre(s) — affinez par assujetti.</p>}
    </div>
  )
}
