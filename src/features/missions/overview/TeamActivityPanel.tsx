import { useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { ROLE_LABELS } from '../mission-constants'
import { useReviewLabels } from '../../organization-settings/useReviewLabels'
import { TeamManagementModal } from './TeamManagementModal'
import type { MissionMemberRow } from '../useMissionDetail'

interface TeamActivityPanelProps {
  missionId: string
  members: MissionMemberRow[]
  onRefetch: () => void
}

export function TeamActivityPanel({ missionId, members, onRefetch }: TeamActivityPanelProps){
  const [showManage, setShowManage] = useState(false)
  const { lead, associate } = useReviewLabels()
  const roleLabel = (role: string) => role === 'lead_auditor' ? lead : role === 'associate' ? associate : (ROLE_LABELS[role] ?? role)

  return (
    <div className="space-y-4">
      {/* Team card */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-gray-900">{'\u00c9'}quipe</span>
          <button onClick={() => setShowManage(true)} className="text-[11px] font-medium text-forest-700 hover:underline">
            G{'\u00e9'}rer
          </button>
        </div>
        <div>
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-gray-50 last:border-b-0">
              <Avatar name={`${m.user.first_name} ${m.user.last_name}`} role={m.role} />
              <span className="flex-1 text-[13px] text-gray-700 truncate">
                {m.user.first_name} {m.user.last_name}
              </span>
              <Badge label={roleLabel(m.role)} variant={roleVariant(m.role)} />
            </div>
          ))}
        </div>
      </div>

      {/* Activity placeholder */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 py-3 border-b border-gray-200">
          <span className="text-[13px] font-semibold text-gray-900">Activit{'\u00e9'} r{'\u00e9'}cente</span>
        </div>
        <div className="px-4 py-6 text-center text-xs text-gray-300">
          L{'\u2019'}historique d{'\u2019'}activit{'\u00e9'} sera disponible prochainement.
        </div>
      </div>

      {/* Team management modal */}
      {showManage && (
        <TeamManagementModal missionId={missionId} members={members} onClose={() => setShowManage(false)} onRefetch={onRefetch} />
      )}
    </div>
  )
}

function Avatar({ name, role }: { name: string; role: string }){
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const bg = role === 'associate' ? 'bg-forest-700' : role === 'lead_auditor' ? 'bg-blue-500' : 'bg-gray-500'
  return (
    <div className={`w-7 h-7 rounded-full ${bg} text-white flex items-center justify-center text-[11px] font-semibold shrink-0`}>
      {initials}
    </div>
  )
}

function roleVariant(role: string): 'green' | 'blue' | 'gray' {
  if (role === 'associate') return 'green'
  if (role === 'lead_auditor') return 'blue'
  return 'gray'
}
