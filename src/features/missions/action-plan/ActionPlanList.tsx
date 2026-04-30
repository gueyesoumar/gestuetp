import { isOverdue } from './ActionPlanKPIs'
import type { ActionPlanCAR } from '../../reports/generateActionPlanXLSX'

interface ActionPlanListProps {
  cars: ActionPlanCAR[]
  onSelect: (car: ActionPlanCAR) => void
}

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

function formatDate(d: string | null): string {
  if (!d) return '—'
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })
}

export function ActionPlanList({ cars, onSelect }: ActionPlanListProps): JSX.Element {
  if (cars.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <p className="text-sm text-gray-400">Aucune action corrective ne correspond aux filtres.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Code</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Domaine</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Contrôle</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Type</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Échéance</th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {cars.map((car) => {
            const cls = CLASS_BADGES[car.finding_classification] ?? { label: car.finding_classification, color: 'text-gray-500 bg-gray-50' }
            const st = STATUS_BADGES[car.status] ?? STATUS_BADGES.open
            const overdue = isOverdue(car)
            const due = car.client_target_date ?? car.deadline
            return (
              <tr key={car.id} onClick={() => onSelect(car)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-forest-700">{car.code}</td>
                <td className="px-4 py-3 text-xs text-gray-700">{car.domain_name ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-700">
                  {car.control_code ? <span className="font-mono font-semibold">{car.control_code}</span> : '—'}
                  {car.control_name && <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[260px]">{car.control_name}</p>}
                </td>
                <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${cls.color}`}>{cls.label}</span></td>
                <td className="px-4 py-3 text-xs">
                  <span className={overdue ? 'text-red-700 font-semibold' : 'text-gray-700'}>{formatDate(due)}</span>
                  {overdue && <span className="ml-1.5 text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">RETARD</span>}
                </td>
                <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
