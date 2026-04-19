import type { MissionMemberRow, ControlAssignmentRow } from '../useMissionDetail'

interface PlanningWorkloadSectionProps {
  members: MissionMemberRow[]
  assignments: ControlAssignmentRow[]
  totalControls: number
}

export function PlanningWorkloadSection({ members, assignments, totalControls }: PlanningWorkloadSectionProps) {
  const auditors = members.filter((m) => m.role === 'auditor' || m.role === 'lead_auditor')
  const idealPerAuditor = auditors.length > 0 ? Math.ceil(totalControls / auditors.length) : 0

  return (
    <div className="p-4 border-b border-gray-200">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">Charge par auditeur</h4>
      {auditors.map((auditor) => {
        const ctrlCount = assignments.filter((a) => a.auditor_id === auditor.user_id).length
        const pct = idealPerAuditor > 0 ? Math.min((ctrlCount / idealPerAuditor) * 100, 100) : 0
        const overloaded = ctrlCount > idealPerAuditor * 1.3
        const underloaded = ctrlCount < idealPerAuditor * 0.5 && ctrlCount > 0
        const color = overloaded ? '#C0392B' : underloaded ? '#E67E22' : '#40916C'
        const label = overloaded ? 'Surcharge' : ctrlCount === 0 ? 'Non affect\u00e9' : underloaded ? 'Sous-utilis\u00e9' : '\u00c9quilibr\u00e9'

        const initials = `${auditor.user.first_name[0]}${auditor.user.last_name[0]}`
        return (
          <div key={auditor.id} className="mb-3 last:mb-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                <span className="w-[18px] h-[18px] rounded-full bg-gray-400 text-white flex items-center justify-center text-[8px] font-semibold">{initials}</span>
                {auditor.user.first_name} {auditor.user.last_name}
              </span>
              <span className="text-[11px] font-semibold" style={{ color }}>{ctrlCount} ctrl</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[10px] text-gray-300">id{'\u00e9'}al : {idealPerAuditor} ctrl</span>
              <span className="text-[10px]" style={{ color }}>{label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
