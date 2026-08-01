import type { ActionPlanCAR } from '../../reports/generateActionPlanXLSX'

interface ActionPlanKPIsProps {
  cars: ActionPlanCAR[]
}

interface KPI {
  label: string
  value: number
  color: string
  bg: string
}

function isOverdue(car: ActionPlanCAR): boolean {
  if (car.status === 'verified' || car.status === 'closed') return false
  const due = car.client_target_date ?? car.deadline
  if (!due) return false
  const d = new Date(due)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

export function ActionPlanKPIs({ cars }: ActionPlanKPIsProps): JSX.Element {
  const total = cars.length
  const open = cars.filter((c) => c.status === 'open').length
  const toVerify = cars.filter((c) => c.status === 'client_responded').length
  const accepted = cars.filter((c) => c.verification_status === 'accepted').length
  const rejected = cars.filter((c) => c.verification_status === 'rejected').length
  const overdue = cars.filter(isOverdue).length

  const kpis: KPI[] = [
    { label: 'Total', value: total, color: 'text-gray-900', bg: 'bg-white border-gray-200' },
    { label: 'Ouvertes', value: open, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
    { label: 'À vérifier', value: toVerify, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
    { label: 'Acceptées', value: accepted, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
    { label: 'Rejetées', value: rejected, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
    { label: 'En retard', value: overdue, color: 'text-red-700', bg: 'bg-red-50 border-red-300' },
  ]

  return (
    <div className="grid grid-cols-6 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className={`rounded-xl border p-4 text-center ${k.bg}`}>
          <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
          <p className="text-[11px] font-medium text-gray-500 mt-1">{k.label}</p>
        </div>
      ))}
    </div>
  )
}

export { isOverdue }
