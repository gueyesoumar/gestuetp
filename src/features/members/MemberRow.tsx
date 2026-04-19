import { Badge } from '../../components/ui/Badge'
import type { MemberWithRoles } from './types'

interface MemberRowProps {
  member: MemberWithRoles
  onAssignRole: (member: MemberWithRoles) => void
}

export function MemberRow({ member, onAssignRole }: MemberRowProps) {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {member.first_name} {member.last_name}
          </p>
          {member.job_title && (
            <p className="text-xs text-gray-500">{member.job_title}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{member.email}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {member.roles.length > 0
            ? member.roles.map((role) => (
                <Badge key={role.id} label={role.name} variant="blue" />
              ))
            : <span className="text-xs text-gray-400">Aucun r&ocirc;le</span>
          }
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge
          label={member.is_active ? 'Actif' : 'Inactif'}
          variant={member.is_active ? 'green' : 'gray'}
        />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onAssignRole(member)}
          className="text-sm text-forest-700 hover:text-forest-900"
        >
          R&ocirc;les
        </button>
      </td>
    </tr>
  )
}
