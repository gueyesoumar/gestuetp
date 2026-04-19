import { MemberRow } from './MemberRow'
import { EmptyState } from '../../components/ui/EmptyState'
import type { MemberWithRoles } from './types'

interface MemberTableProps {
  members: MemberWithRoles[]
  onAssignRole: (member: MemberWithRoles) => void
}

export function MemberTable({ members, onAssignRole }: MemberTableProps) {
  if (members.length === 0) {
    return (
      <EmptyState
        title="Aucun membre"
        description="Invitez des membres pour commencer."
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="px-4 py-3">Membre</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">R&ocirc;le</th>
            <th className="px-4 py-3">Statut</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              onAssignRole={onAssignRole}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
