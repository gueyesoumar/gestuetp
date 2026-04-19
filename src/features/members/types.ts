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
