import type { User, PlatformRole } from '../../types/database.types'

export interface MemberWithRoles extends User {
  roles: PlatformRole[]
}

export interface InviteMemberPayload {
  email: string
  first_name: string
  last_name: string
  role_id: string
  organization_id: string
}

export interface MemberAuditLog {
  id: string
  organization_id: string
  target_user_id: string
  performed_by: string
  action: MemberAuditAction
  details: Record<string, unknown> | null
  created_at: string
  performer?: { first_name: string; last_name: string } | null
}

export type MemberAuditAction =
  | 'invited'
  | 'role_assigned'
  | 'role_removed'
  | 'deactivated'
  | 'reactivated'
  | 'invitation_resent'

export type MemberFilterStatus = 'all' | 'active' | 'inactive'
