import { useState, useMemo, useCallback } from 'react'
import { Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useMembers } from '../features/members/useMembers'
import { usePlatformRoles } from '../features/members/usePlatformRoles'
import { useToggleMemberStatus } from '../features/members/useToggleMemberStatus'
import { MemberTable } from '../features/members/MemberTable'
import { MemberSearchBar } from '../features/members/MemberSearchBar'
import { InviteMemberModal } from '../features/members/InviteMemberModal'
import { RoleAssignmentModal } from '../features/members/RoleAssignmentModal'
import { RoleManagementModal } from '../features/members/RoleManagementModal'
import { MemberProfileDrawer } from '../features/members/MemberProfileDrawer'
import { ResetPasswordModal } from '../features/members/ResetPasswordModal'
import { ConfirmDialog } from '../features/members/ConfirmDialog'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import type { MemberWithRoles, MemberFilterStatus } from '../features/members/types'

export function MembersPage() {
  const { members, loading, error, refetch } = useMembers()
  const { roles } = usePlatformRoles()
  const { toggleStatus } = useToggleMemberStatus(refetch)

  // Modals
  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleManagementOpen, setRoleManagementOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberWithRoles | null>(null)
  const [profileMember, setProfileMember] = useState<MemberWithRoles | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<MemberWithRoles | null>(null)
  const [resendTarget, setResendTarget] = useState<MemberWithRoles | null>(null)
  const [resetPwTarget, setResetPwTarget] = useState<MemberWithRoles | null>(null)

  // Search & filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MemberFilterStatus>('all')
  const [roleFilter, setRoleFilter] = useState('')

  const filteredMembers = useMemo(() => {
    let result = members

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.first_name.toLowerCase().includes(q) ||
          m.last_name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter === 'active') {
      result = result.filter((m) => m.is_active)
    } else if (statusFilter === 'inactive') {
      result = result.filter((m) => !m.is_active)
    }

    // Role filter
    if (roleFilter) {
      result = result.filter((m) => m.roles.some((r) => r.id === roleFilter))
    }

    return result
  }, [members, search, statusFilter, roleFilter])

  const handleToggleStatus = useCallback((member: MemberWithRoles) => {
    setConfirmTarget(member)
  }, [])

  const confirmToggleStatus = useCallback(async () => {
    if (!confirmTarget) return
    await toggleStatus(confirmTarget.id, !confirmTarget.is_active)
    setConfirmTarget(null)
  }, [confirmTarget, toggleStatus])

  const handleResendInvite = useCallback((member: MemberWithRoles) => {
    setResendTarget(member)
  }, [])

  const confirmResendInvite = useCallback(async () => {
    if (!resendTarget) return
    await supabase.functions.invoke('invite-member', {
      body: {
        email: resendTarget.email,
        first_name: resendTarget.first_name,
        last_name: resendTarget.last_name,
        organization_id: resendTarget.organization_id,
        resend: true,
      },
    })
    setResendTarget(null)
  }, [resendTarget])

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Membres</h2>
          <p className="mt-1 text-sm text-gray-600">
            G&eacute;rez les membres de votre organisation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            onClick={() => setRoleManagementOpen(true)}
          >
            <Settings size={16} />
            R&ocirc;les
          </button>
          <button
            className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900"
            onClick={() => setInviteOpen(true)}
          >
            Inviter un membre
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mt-4">
        <MemberSearchBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          roleFilter={roleFilter}
          onRoleFilterChange={setRoleFilter}
          roleOptions={roles.map((r) => ({ id: r.id, name: r.name }))}
        />
      </div>

      {/* Count */}
      <p className="mt-3 text-xs text-gray-400">
        {filteredMembers.length} membre{filteredMembers.length !== 1 ? 's' : ''}
        {filteredMembers.length !== members.length && ` sur ${members.length}`}
      </p>

      {/* Table */}
      <div className="mt-2">
        <MemberTable
          members={filteredMembers}
          onAssignRole={(member) => setSelectedMember(member)}
          onToggleStatus={handleToggleStatus}
          onResendInvite={handleResendInvite}
          onViewProfile={(member) => setProfileMember(member)}
          onResetPassword={(member) => setResetPwTarget(member)}
        />
      </div>

      {/* Modals */}
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

      <RoleManagementModal
        open={roleManagementOpen}
        onClose={() => setRoleManagementOpen(false)}
      />

      {profileMember && (
        <MemberProfileDrawer
          member={profileMember}
          open={!!profileMember}
          onClose={() => setProfileMember(null)}
        />
      )}

      {/* Confirm deactivation */}
      {confirmTarget && (
        <ConfirmDialog
          open={!!confirmTarget}
          title={confirmTarget.is_active ? 'D\u00e9sactiver le membre' : 'R\u00e9activer le membre'}
          message={
            confirmTarget.is_active
              ? `\u00cates-vous s\u00fbr de vouloir d\u00e9sactiver ${confirmTarget.first_name} ${confirmTarget.last_name}\u00a0? Ce membre ne pourra plus se connecter.`
              : `R\u00e9activer ${confirmTarget.first_name} ${confirmTarget.last_name}\u00a0? Ce membre pourra \u00e0 nouveau se connecter.`
          }
          confirmLabel={confirmTarget.is_active ? 'D\u00e9sactiver' : 'R\u00e9activer'}
          danger={confirmTarget.is_active}
          onConfirm={confirmToggleStatus}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      {/* Confirm resend invite */}
      {resendTarget && (
        <ConfirmDialog
          open={!!resendTarget}
          title="Renvoyer l&rsquo;invitation"
          message={`Renvoyer une invitation \u00e0 ${resendTarget.email}\u00a0?`}
          confirmLabel="Renvoyer"
          onConfirm={confirmResendInvite}
          onCancel={() => setResendTarget(null)}
        />
      )}

      {/* Reset password */}
      {resetPwTarget && (
        <ResetPasswordModal
          member={resetPwTarget}
          open={!!resetPwTarget}
          onClose={() => setResetPwTarget(null)}
        />
      )}
    </div>
  )
}
