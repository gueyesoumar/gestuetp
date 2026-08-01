import type { MemberWithRoles } from '../members/types'
import { useReviewLabels } from '../organization-settings/useReviewLabels'

interface MissionTeamSectionProps {
  members: MemberWithRoles[]
  associateId: string
  leadAuditorId: string
  selectedMemberIds: string[]
  disabled: boolean
  onAssociateId: (v: string) => void
  onLeadAuditorId: (v: string) => void
  onToggleMember: (id: string) => void
}

export function MissionTeamSection({
  members, associateId, leadAuditorId, selectedMemberIds, disabled,
  onAssociateId, onLeadAuditorId, onToggleMember,
}: MissionTeamSectionProps) {
  const { lead, associate } = useReviewLabels()
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-gray-900">&Eacute;quipe de mission</legend>

      <div>
        <label htmlFor="mission-associate" className="block text-sm font-medium text-gray-700">{associate}</label>
        <select
          id="mission-associate"
          required
          value={associateId}
          onChange={(e) => onAssociateId(e.target.value)}
          disabled={disabled}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
        >
          <option value="">S&eacute;lectionner&nbsp;: {associate.toLowerCase()}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="mission-lead" className="block text-sm font-medium text-gray-700">{lead}</label>
        <select
          id="mission-lead"
          required
          value={leadAuditorId}
          onChange={(e) => onLeadAuditorId(e.target.value)}
          disabled={disabled}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
        >
          <option value="">S&eacute;lectionner&nbsp;: {lead.toLowerCase()}</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
          ))}
        </select>
      </div>

      <div>
        <span className="block text-sm font-medium text-gray-700">Auditeurs</span>
        <p className="mt-1 text-xs text-gray-500">S&eacute;lectionnez les membres de l&apos;&eacute;quipe.</p>
        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
          {members.map((m) => {
            const isLeadOrAssociate = m.id === associateId || m.id === leadAuditorId
            return (
              <label key={m.id} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(m.id) || isLeadOrAssociate}
                  onChange={() => onToggleMember(m.id)}
                  disabled={disabled || isLeadOrAssociate}
                  className="rounded border-gray-300"
                />
                <span className={isLeadOrAssociate ? 'text-gray-400' : ''}>
                  {m.first_name} {m.last_name}
                </span>
                {m.id === associateId && <span className="text-xs text-forest-500">({associate})</span>}
                {m.id === leadAuditorId && <span className="text-xs text-forest-500">({lead})</span>}
              </label>
            )
          })}
        </div>
      </div>
    </fieldset>
  )
}
