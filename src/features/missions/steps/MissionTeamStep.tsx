import type { MemberWithRoles } from '../../members/types'
import { useReviewLabels } from '../../organization-settings/useReviewLabels'

interface MissionTeamStepProps {
  members: MemberWithRoles[]
  associateId: string
  leadAuditorId: string
  selectedMemberIds: string[]
  totalControls: number
  onAssociateId: (id: string) => void
  onLeadAuditorId: (id: string) => void
  onToggleMember: (id: string) => void
}

export function MissionTeamStep({
  members, associateId, leadAuditorId, selectedMemberIds, totalControls,
  onAssociateId, onLeadAuditorId, onToggleMember,
}: MissionTeamStepProps) {
  const { lead, associate } = useReviewLabels()
  const suggestedAuditors = totalControls > 60 ? '3 à 4' : totalControls > 30 ? '2 à 3' : '1 à 2'
  const suggestedDays = totalControls > 60 ? '15 à 20' : totalControls > 30 ? '10 à 15' : '5 à 10'

  return (
    <div>
      <h3 className="text-lg font-bold text-gray-900">Constituez l'équipe</h3>
      <p className="mt-1 text-[13px] text-gray-500">Désignez l'associé, le chef de mission et les auditeurs</p>

      <div className="mt-4 flex items-center gap-2 rounded-[10px] bg-forest-50 border border-forest-100 px-4 py-3 text-[12px] text-forest-700">
        <span>💡</span>
        Pour <strong>{totalControls} contrôles</strong>, nous recommandons <strong>{suggestedAuditors} auditeurs</strong> sur une durée de <strong>{suggestedDays} jours</strong>.
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3.5">
        <div>
          <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
            {associate} <span className="font-normal text-gray-300">Validateur ultime</span>
          </label>
          <select value={associateId} onChange={(e) => onAssociateId(e.target.value)} className="w-full">
            <option value="">Sélectionner</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
            {lead} <span className="font-normal text-gray-300">Coordonne l'équipe</span>
          </label>
          <select value={leadAuditorId} onChange={(e) => onLeadAuditorId(e.target.value)} className="w-full">
            <option value="">Sélectionner</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
          Auditeurs <span className="font-normal text-gray-300">Sélectionnez les membres de l'équipe</span>
        </label>
        <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-[10px] border border-gray-200 bg-forest-50 p-2">
          {members.map((m) => {
            const isLeadOrAssociate = m.id === associateId || m.id === leadAuditorId
            return (
              <label key={m.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] cursor-pointer hover:bg-white">
                <input
                  type="checkbox"
                  checked={selectedMemberIds.includes(m.id) || isLeadOrAssociate}
                  onChange={() => onToggleMember(m.id)}
                  disabled={isLeadOrAssociate}
                  className="accent-forest-700"
                />
                <span className={isLeadOrAssociate ? 'text-gray-400' : 'text-gray-700'}>{m.first_name} {m.last_name}</span>
                {m.id === associateId && <span className="text-[10px] text-gold-600 ml-auto">{associate}</span>}
                {m.id === leadAuditorId && <span className="text-[10px] text-forest-500 ml-auto">{lead}</span>}
              </label>
            )
          })}
        </div>
      </div>
    </div>
  )
}
