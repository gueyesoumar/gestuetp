import { Badge } from '../../components/ui/Badge'
import { MissionStatusBadge } from './MissionStatusBadge'
import type { MissionDetail, MissionMemberRow } from './useMissionDetail'

interface MissionOverviewTabProps {
  mission: MissionDetail
  members: MissionMemberRow[]
}

const roleLabels: Record<string, string> = {
  associate: 'Associ\u00e9',
  lead_auditor: 'Chef de mission',
  auditor: 'Auditeur',
}

export function MissionOverviewTab({ mission, members }: MissionOverviewTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <InfoCard label="Client" value={mission.client?.name} />
        <InfoCard label="R&eacute;f&eacute;rentiel" value={`${mission.framework?.name} ${mission.framework?.version ? `v${mission.framework.version}` : ''}`} />
        <InfoCard label="P&eacute;riode" value={mission.start_date && mission.end_date ? `${mission.start_date} \u2192 ${mission.end_date}` : '\u2014'} />
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Statut</p>
          <div className="mt-1"><MissionStatusBadge status={mission.status} /></div>
        </div>
      </div>

      {mission.description && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-gray-500">Description</p>
          <p className="mt-1 text-sm text-gray-700">{mission.description}</p>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium uppercase text-gray-500 mb-3">&Eacute;quipe ({members.length})</p>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-900">{m.user.first_name} {m.user.last_name}</span>
              <Badge label={roleLabels[m.role] ?? m.role} variant={m.role === 'associate' ? 'green' : m.role === 'lead_auditor' ? 'blue' : 'gray'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  )
}
