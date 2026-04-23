import type { Organization } from '../types/database.types'

/** Organisation de type "group" (superviseur, ex: DCSSI) */
export function isGroupOrg(org: Pick<Organization, 'types'>): boolean {
  return org.types.includes('group')
}

/** Organisation de type "cabinet" (peut créer des missions, auditer) */
export function isCabinetOrg(org: Pick<Organization, 'types'>): boolean {
  return org.types.includes('cabinet')
}

/** Organisation de type "client" (entité auditée) */
export function isClientOrg(org: Pick<Organization, 'types'>): boolean {
  return org.types.includes('client')
}

/** Organisation qui est une filiale (rattachée à un groupe) */
export function isSubsidiaryOrg(org: Pick<Organization, 'parent_org_id'>): boolean {
  return org.parent_org_id !== null
}

/** Organisation qui cumule groupe + cabinet (ex: DCSSI qui audite ET supervise) */
export function isGroupCabinetOrg(org: Pick<Organization, 'types'>): boolean {
  return org.types.includes('group') && org.types.includes('cabinet')
}

/** Label lisible du type d'organisation */
export function getOrgTypeLabel(org: Pick<Organization, 'types' | 'parent_org_id'>): string {
  if (isGroupOrg(org) && isCabinetOrg(org)) return 'Groupe & Cabinet'
  if (isGroupOrg(org)) return 'Groupe'
  if (isCabinetOrg(org)) return 'Cabinet'
  if (isSubsidiaryOrg(org)) return 'Entit\u00e9 supervis\u00e9e'
  if (isClientOrg(org)) return 'Client'
  return 'Organisation'
}
