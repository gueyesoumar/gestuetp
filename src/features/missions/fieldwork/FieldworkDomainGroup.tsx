import { useState, useMemo } from 'react'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { AssessmentWithControl } from '../useAuditorAssessments'
import type { ControlAssignmentRow } from '../useMissionDetail'

interface FieldworkDomainGroupProps {
  domain: DomainWithControls
  assessments: AssessmentWithControl[]
  assignments: ControlAssignmentRow[]
  auditorMap: Map<string, string>
  selectedControlId: string | null
  onSelectControl: (controlId: string) => void
  defaultOpen?: boolean
  filter: string
  search: string
}

export function FieldworkDomainGroup({ domain, assessments, assignments, auditorMap, selectedControlId, onSelectControl, defaultOpen = false, filter, search }: FieldworkDomainGroupProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)

  // Build a map of control_id → assessment status
  const assessmentMap = useMemo(() => {
    const map = new Map<string, AssessmentWithControl>()
    for (const a of assessments) {
      if (domain.controls.some((c) => c.id === a.control_id)) {
        map.set(a.control_id, a)
      }
    }
    return map
  }, [assessments, domain.controls])

  // Filter controls based on filter + search
  const visibleControls = useMemo(() => {
    return domain.controls.filter((c) => {
      const assessment = assessmentMap.get(c.id)
      const status = assessment?.status ?? 'not_started'

      // Filter
      if (filter === 'not_started' && status !== 'not_started') return false
      if (filter === 'draft' && status !== 'draft' && status !== 'rejected') return false
      if (filter === 'submitted' && status !== 'submitted' && status !== 'in_review') return false
      if (filter === 'approved' && status !== 'approved') return false

      // Search
      if (search) {
        const q = search.toLowerCase()
        return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
      }
      return true
    })
  }, [domain.controls, assessmentMap, filter, search])

  if (visibleControls.length === 0) return <></>

  const total = domain.controls.length
  const completed = domain.controls.filter((c) => {
    const a = assessmentMap.get(c.id)
    return a && (a.status === 'submitted' || a.status === 'in_review' || a.status === 'approved')
  }).length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const barColor = pct === 100 ? '#27AE60' : pct >= 50 ? '#D4A843' : pct > 0 ? '#E67E22' : '#E5E7EB'

  return (
    <div className="border-b border-gray-200">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-[#FAFAFA] hover:bg-forest-50 transition-colors text-left">
        <ChevronIcon open={open} />
        <span className="text-xs font-semibold text-gray-900 flex-1 truncate">{domain.name}</span>
        <div className="w-12 h-1 bg-gray-200 rounded-full shrink-0">
          <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <span className="text-[11px] font-semibold w-12 text-right shrink-0 text-gray-400">{completed}/{total}</span>
      </button>

      {open && visibleControls.map((control) => {
        const assessment = assessmentMap.get(control.id)
        const isSelected = selectedControlId === control.id
        const status = assessment?.status ?? 'not_started'

        return (
          <button
            key={control.id}
            onClick={() => onSelectControl(control.id)}
            className={`w-full flex items-center gap-2 px-3.5 py-2 pl-8 text-left border-b border-gray-50 last:border-b-0 transition-colors ${
              isSelected ? 'bg-forest-100 border-l-[3px] border-l-forest-700 pl-[29px]' : 'hover:bg-forest-50'
            }`}
          >
            <StatusDot status={status} />
            <div className="flex-1 min-w-0">
              <span className="block text-[11px] font-mono font-medium text-forest-700">{control.code}</span>
              <span className="block text-xs text-gray-700 truncate">{control.name}</span>
              {assessment && auditorMap.get(assessment.auditor_id) && (
                <span className="block text-[9px] text-gray-300 mt-0.5">{auditorMap.get(assessment.auditor_id)}</span>
              )}
            </div>
            <StatusLabel status={status} />
          </button>
        )
      })}
    </div>
  )
}

function StatusDot({ status }: { status: string }): JSX.Element {
  const colors: Record<string, string> = {
    not_started: 'bg-gray-200 border-2 border-gray-300',
    draft: 'bg-gray-400',
    submitted: 'bg-blue-500',
    in_review: 'bg-gold-500',
    approved: 'bg-green-600',
    rejected: 'bg-red-600',
  }
  return <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[status] ?? 'bg-gray-200'}`} />
}

function StatusLabel({ status }: { status: string }): JSX.Element | null {
  if (status === 'not_started') return <span className="text-[9px] text-gray-300">Non commenc&eacute;</span>
  if (status === 'draft') return <span className="text-[9px] text-gray-400">Brouillon</span>
  if (status === 'submitted' || status === 'in_review') return <span className="text-[9px] text-blue-500 font-medium">Soumis</span>
  if (status === 'approved') return <span className="text-[9px] text-green-600 font-medium">Valid&eacute;</span>
  if (status === 'rejected') return <span className="text-[9px] text-red-500 font-medium">Rejet&eacute;</span>
  return null
}

function ChevronIcon({ open }: { open: boolean }): JSX.Element {
  return (
    <svg className={`w-3.5 h-3.5 text-gray-300 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}
