import { useState, useMemo } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { WorkProgramControlRow } from './WorkProgramControlRow'
import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { ControlPlanning } from '../../../types/database.types'
import type { MissionMemberRow, ControlAssignmentRow } from '../useMissionDetail'

interface WorkProgramTableProps {
  domains: DomainWithControls[]
  plannings: ControlPlanning[]
  assignments: ControlAssignmentRow[]
  members: MissionMemberRow[]
  onPlanningChange: (controlId: string, field: string, value: unknown) => void
  onAssign: (controlId: string, auditorId: string) => void
  onAssignDomain: (controlIds: string[], auditorId: string) => void
}

export function WorkProgramTable({ domains, plannings, assignments, members, onPlanningChange, onAssign, onAssignDomain }: WorkProgramTableProps) {
  const [search, setSearch] = useState('')
  const planMap = useMemo(() => new Map(plannings.map((p) => [p.control_id, p])), [plannings])
  const assignMap = useMemo(() => new Map(assignments.map((a) => [a.control_id, a])), [assignments])
  const auditors = members.filter((m) => m.role === 'auditor' || m.role === 'lead_auditor')
  void plannings // referenced by child components
  const totalControls = domains.reduce((s, d) => s + d.controls.length, 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="px-2.5 py-1.5 pl-7 border border-gray-200 rounded-lg text-xs w-[200px] outline-none focus:border-forest-500 bg-[#FAFAF8] bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2213%22%20height%3D%2213%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20d%3D%22M21%2021l-4.35-4.35M11%2019a8%208%200%20100-16%208%208%200%20000%2016z%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22/%3E%3C/svg%3E')] bg-no-repeat bg-[8px_center]"
          />
        </div>
        <div className="flex gap-2 items-center">
          <Badge label={`${assignments.length}/${totalControls} affect\u00e9s`} variant={assignments.length === totalControls ? 'green' : 'gray'} />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ tableLayout: 'auto' }}>
          <thead>
            <tr className="bg-[#FAFAFA] border-b border-gray-200 sticky top-0 z-[1]">
              <th className="pl-4 pr-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500" style={{ width: '7%' }}>Code</th>
              <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">Contr&ocirc;le</th>
              <th className="px-2 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500" style={{ width: '10%' }}>Risque</th>
              <th className="pl-2 pr-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500" style={{ width: '18%' }}>Auditeur</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((domain) => {
              const domainAssigned = domain.controls.filter((c) => assignMap.has(c.id)).length
              const unassigned = domain.controls.filter((c) => !assignMap.has(c.id)).map((c) => c.id)
              const q = search.toLowerCase()
              const filtered = domain.controls.filter((c) => !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
              if (filtered.length === 0) return null

              return (
                <DomainGroup key={domain.id} code={domain.code} name={domain.name} assigned={domainAssigned} total={domain.controls.length} unassignedIds={unassigned} auditors={auditors} onAssignDomain={onAssignDomain}>
                  {filtered.map((control) => (
                    <WorkProgramControlRow key={control.id} control={control} planning={planMap.get(control.id)} assignment={assignMap.get(control.id)} auditors={auditors} onPlanningChange={onPlanningChange} onAssign={onAssign} />
                  ))}
                </DomainGroup>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DomainGroup({ code, name, assigned, total, unassignedIds, auditors, onAssignDomain, children }: {
  code: string; name: string; assigned: number; total: number; unassignedIds: string[]
  auditors: MissionMemberRow[]; onAssignDomain: (ids: string[], auditorId: string) => void; children: React.ReactNode
}) {
  const [bulkAuditor, setBulkAuditor] = useState('')
  const [open, setOpen] = useState(true)
  return (
    <>
      <tr className="bg-[#FAFAFA] border-b border-gray-200 border-t border-t-gray-200 cursor-pointer select-none" onClick={() => setOpen(!open)}>
        <td colSpan={4} className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
              <span className="font-mono text-[12px] font-bold text-forest-700">{code}</span>
              <span className="text-[13px] font-semibold text-gray-900">{name}</span>
              <Badge label={`${assigned}/${total}`} variant={assigned === total ? 'green' : 'gold'} />
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {unassignedIds.length > 0 && (
                <>
                  <select value={bulkAuditor} onChange={(e) => setBulkAuditor(e.target.value)} className="text-[10px] border border-forest-300 rounded-lg px-2 py-1 bg-forest-50 text-forest-700">
                    <option value="">Affecter tout...</option>
                    {auditors.map((a) => <option key={a.user_id} value={a.user_id}>{a.user.first_name[0]}. {a.user.last_name}</option>)}
                  </select>
                  <button onClick={() => { if (bulkAuditor) onAssignDomain(unassignedIds, bulkAuditor) }} disabled={!bulkAuditor} className="text-[10px] font-semibold text-forest-700 bg-forest-50 border border-forest-300 px-2.5 py-1 rounded-lg hover:bg-forest-100 disabled:opacity-40">
                    OK
                  </button>
                </>
              )}
            </div>
          </div>
        </td>
      </tr>
      {open && children}
    </>
  )
}
