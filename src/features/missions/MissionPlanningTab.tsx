import { Badge } from '../../components/ui/Badge'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { DomainAssignmentBlock } from './DomainAssignmentBlock'
import { useAssignControls } from './useAssignControls'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'
import type { MissionMemberRow, ControlAssignmentRow } from './useMissionDetail'

interface MissionPlanningTabProps {
  missionId: string
  domains: DomainWithControls[]
  members: MissionMemberRow[]
  assignments: ControlAssignmentRow[]
  onRefetch: () => void
}

export function MissionPlanningTab({ missionId, domains, members, assignments, onRefetch }: MissionPlanningTabProps) {
  const { assignControls, assigning, error } = useAssignControls(onRefetch)
  const auditors = members.filter((m) => m.role === 'auditor' || m.role === 'lead_auditor')
  const assignmentMap = new Map(assignments.map((a) => [a.control_id, a]))

  const totalControls = domains.reduce((sum, d) => sum + d.controls.length, 0)
  const assignedCount = assignments.length

  const handleAssignControl = (controlId: string, auditorId: string) => {
    assignControls(missionId, [{ control_id: controlId, auditor_id: auditorId }])
  }

  const handleAssignDomain = (controlIds: string[], auditorId: string) => {
    assignControls(missionId, controlIds.map((id) => ({ control_id: id, auditor_id: auditorId })))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Planification</h3>
          <p className="text-sm text-gray-600">
            Affectez les contr&ocirc;les par domaine ou individuellement.
          </p>
        </div>
        <Badge label={`${assignedCount}/${totalControls} affect\u00e9s`} variant={assignedCount === totalControls ? 'green' : 'blue'} />
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="space-y-3">
        {domains.map((domain) => (
          <DomainAssignmentBlock
            key={domain.id}
            domain={domain}
            auditors={auditors}
            assignmentMap={assignmentMap}
            assigning={assigning}
            onAssignControl={handleAssignControl}
            onAssignDomain={handleAssignDomain}
          />
        ))}
      </div>
    </div>
  )
}
