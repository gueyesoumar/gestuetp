import { useState, useMemo } from 'react'
import { FieldworkDomainGroup } from './FieldworkDomainGroup'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { AssessmentWithControl } from '../useAuditorAssessments'
import type { MissionMemberRow } from '../useMissionDetail'

interface FieldworkSidebarProps {
  domains: DomainWithControls[]
  assessments: AssessmentWithControl[]
  members: MissionMemberRow[]
  selectedControlId: string | null
  onSelectControl: (controlId: string) => void
}

type FilterKey = 'all' | 'not_started' | 'draft' | 'submitted' | 'approved'

export function FieldworkSidebar({ domains, assessments, members, selectedControlId, onSelectControl }: FieldworkSidebarProps): JSX.Element {
  // Build auditor name map
  const auditorMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      if (m.user) {
        map.set(m.user.id, `${m.user.first_name} ${m.user.last_name.charAt(0)}.`)
      }
    }
    return map
  }, [members])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')

  const totalControls = domains.reduce((sum, d) => sum + d.controls.length, 0)

  const counts = useMemo(() => ({
    all: totalControls,
    not_started: totalControls - assessments.length,
    draft: assessments.filter((a) => a.status === 'draft' || a.status === 'rejected').length,
    submitted: assessments.filter((a) => a.status === 'submitted' || a.status === 'in_review').length,
    approved: assessments.filter((a) => a.status === 'approved').length,
  }), [assessments, totalControls])

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'not_started', label: 'Non commenc\u00e9' },
    { key: 'draft', label: 'Brouillon' },
    { key: 'submitted', label: 'Soumis' },
    { key: 'approved', label: 'Valid\u00e9' },
  ]

  return (
    <div className="border-r border-gray-200 flex flex-col bg-white overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un contr&ocirc;le..."
          className="w-full px-3 py-2 pl-8 border border-gray-200 rounded-lg text-xs text-gray-700 bg-[#FAFAF8] outline-none focus:border-forest-500 focus:bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M21%2021l-4.35-4.35M11%2019a8%208%200%20100-16%208%208%200%20000%2016z%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22/%3E%3C/svg%3E')] bg-no-repeat bg-[10px_center]"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-3 py-2 border-b border-gray-200 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap transition-colors ${
              filter === f.key ? 'bg-forest-700 text-white' : 'text-gray-500 hover:bg-forest-50'
            }`}
          >
            {f.label}
            <span className={`text-[10px] font-semibold px-1 rounded-full ${filter === f.key ? 'bg-white/20' : 'bg-gray-100'}`}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Domain list */}
      <div className="flex-1 overflow-y-auto">
        {domains.map((domain, i) => (
          <FieldworkDomainGroup
            key={domain.id}
            domain={domain}
            assessments={assessments}
            auditorMap={auditorMap}
            selectedControlId={selectedControlId}
            onSelectControl={onSelectControl}
            defaultOpen={i === 0}
            filter={filter}
            search={search}
          />
        ))}
      </div>
    </div>
  )
}
