import type { ControlAssignmentRow } from '../useMissionDetail'

interface PlanningBudgetBannerProps {
  assignments: ControlAssignmentRow[]
  totalControls: number
}

export function PlanningBudgetBanner({ assignments, totalControls }: PlanningBudgetBannerProps) {
  const assignedCount = assignments.length
  const remainingCount = totalControls - assignedCount

  return (
    <div className="flex border-b border-gray-200">
      <BudgetItem value={`${totalControls}`} label={'Total contr\u00f4les'} color="var(--color-forest-700)" />
      <BudgetItem value={`${assignedCount}`} label={'Affect\u00e9s'} color="var(--color-gold-500)" />
      <BudgetItem value={`${remainingCount}`} label="Restants" color={remainingCount === 0 ? 'var(--color-success)' : 'var(--color-text-300)'} />
    </div>
  )
}

function BudgetItem({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex-1 py-3.5 px-4 text-center border-r border-gray-200 last:border-r-0">
      <p className="text-[22px] font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
