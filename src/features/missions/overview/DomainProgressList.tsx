import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { AssessmentWithControl } from '../useAuditorAssessments'

interface DomainProgressListProps {
  domains: DomainWithControls[]
  assessments: AssessmentWithControl[]
}

export function DomainProgressList({ domains, assessments }: DomainProgressListProps){
  return (
    <div className="bg-white border border-gray-200 rounded-xl">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Progression par domaine</h3>
        <span className="text-xs text-gray-300">{domains.length} domaines</span>
      </div>
      <div>
        {domains.map((domain) => {
          const total = domain.controls.length
          const assessed = domain.controls.filter((c) =>
            assessments.some((a) => a.control_id === c.id && a.findings)
          ).length
          const pct = total > 0 ? Math.round((assessed / total) * 100) : 0
          const color = pct === 100 ? '#27AE60' : pct >= 60 ? '#40916C' : pct >= 30 ? '#D4A843' : pct > 0 ? '#E67E22' : '#E5E7EB'

          return (
            <div key={domain.id} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-b-0">
              <span className="w-10 text-xs font-mono font-medium text-forest-700 shrink-0">{domain.code}</span>
              <span className="flex-1 text-[13px] text-gray-700 truncate">{domain.name}</span>
              <div className="w-[120px] shrink-0">
                <div className="h-1.5 bg-gray-200 rounded-full">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
              <span className="w-10 text-xs font-semibold text-right shrink-0" style={{ color }}>{pct}%</span>
              <span className="w-10 text-[11px] text-gray-300 text-right shrink-0">{assessed}/{total}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
