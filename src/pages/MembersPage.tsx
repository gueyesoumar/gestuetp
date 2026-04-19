import { useState } from 'react'
import { useMembers } from '../features/members/useMembers'
import { MemberTable } from '../features/members/MemberTable'
import { InviteMemberModal } from '../features/members/InviteMemberModal'
import { RoleAssignmentModal } from '../features/members/RoleAssignmentModal'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import type { MemberWithRoles } from '../features/members/types'

export function MembersPage() {
  const { members, loading, error, refetch } = useMembers()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberWithRoles | null>(null)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Membres</h2>
          <p className="mt-1 text-sm text-gray-600">
            G&eacute;rez les membres de votre organisation.
          </p>
        </div>
        <button
          className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900"
          onClick={() => setInviteOpen(true)}
        >
          Inviter un membre
        </button>
      </div>

      <div className="mt-6">
        <MemberTable
          members={members}
          onAssignRole={(member) => setSelectedMember(member)}
        />
      </div>

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={refetch}
      />

      {selectedMember && (
        <RoleAssignmentModal
          member={selectedMember}
          open={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}
