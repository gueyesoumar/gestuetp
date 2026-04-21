import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'
import type { MissionMemberRow, ControlAssignmentRow } from './useMissionDetail'

interface DomainAssignmentBlockProps {
  domain: DomainWithControls
  auditors: MissionMemberRow[]
  assignmentMap: Map<string, ControlAssignmentRow>
  assigning: boolean
  onAssignControl: (controlId: string, auditorId: string) => void
  onAssignDomain: (controlIds: string[], auditorId: string) => void
}

export function DomainAssignmentBlock({
  domain, auditors, assignmentMap, assigning,
  onAssignControl, onAssignDomain,
}: DomainAssignmentBlockProps) {
  const [domainAuditorId, setDomainAuditorId] = useState('')
  const [controlAuditors, setControlAuditors] = useState<Record<string, string>>({})

  const assignedCount = domain.controls.filter((c) => assignmentMap.has(c.id)).length
  const allAssigned = assignedCount === domain.controls.length
  const allControlIds = domain.controls.map((c) => c.id)

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold text-forest-700">{domain.code}</span>
          <span className="text-sm font-medium text-gray-900">{domain.name}</span>
          <Badge label={`${assignedCount}/${domain.controls.length}`} variant={allAssigned ? 'green' : 'gray'} />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={domainAuditorId}
            onChange={(e) => setDomainAuditorId(e.target.value)}
            disabled={assigning}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
          >
            <option value="">{allAssigned ? 'R\u00e9affecter le domaine' : 'Auditeur pour le domaine'}</option>
            {auditors.map((a) => (
              <option key={a.user_id} value={a.user_id}>
                {a.user.first_name} {a.user.last_name}
              </option>
            ))}
          </select>
          <button
            onClick={() => { if (domainAuditorId) onAssignDomain(allControlIds, domainAuditorId) }}
            disabled={assigning || !domainAuditorId}
            className="rounded bg-forest-700 px-3 py-1 text-xs text-white hover:bg-forest-900 disabled:opacity-50"
          >
            {allAssigned ? 'R\u00e9affecter' : 'Affecter le domaine'}
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {domain.controls.map((control) => {
          const existing = assignmentMap.get(control.id)
          return (
            <div key={control.id} className="flex items-center gap-3 px-4 py-2">
              <span className="w-20 text-xs font-mono text-forest-700">{control.code}</span>
              <span className="flex-1 text-sm text-gray-900 line-clamp-1">{control.name}</span>
              <div className="flex items-center gap-2">
                <select
                  value={existing?.auditor_id ?? controlAuditors[control.id] ?? ''}
                  onChange={(e) => {
                    if (existing && e.target.value) {
                      onAssignControl(control.id, e.target.value)
                    } else {
                      setControlAuditors((prev) => ({ ...prev, [control.id]: e.target.value }))
                    }
                  }}
                  disabled={assigning}
                  className={`rounded-lg border px-2.5 py-1.5 text-[12px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 ${
                    existing ? 'border-transparent hover:border-gray-200 bg-emerald-50 text-emerald-700' : 'border-gray-200'
                  }`}
                >
                  <option value="">Auditeur</option>
                  {auditors.map((a) => (
                    <option key={a.user_id} value={a.user_id}>
                      {a.user.first_name} {a.user.last_name}
                    </option>
                  ))}
                </select>
                {!existing && (
                  <button
                    onClick={() => { if (controlAuditors[control.id]) onAssignControl(control.id, controlAuditors[control.id]) }}
                    disabled={assigning || !controlAuditors[control.id]}
                    className="rounded bg-forest-700 px-2 py-1 text-xs text-white hover:bg-forest-900 disabled:opacity-50"
                  >
                    Affecter
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
