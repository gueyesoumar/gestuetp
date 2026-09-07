import type { Organization } from '../types/database.types'

/**
 * Types canoniques d'organisation. Aligné sur la contrainte CHECK
 * organizations_types_canonical (migration 00094).
 *  - cabinet  : cabinet d'audit
 *  - client   : entité auditée (autonome)
 *  - group    : groupe / holding (cumulable avec cabinet)
 *  - platform : super-admin Gëstu (réservé, non sélectionnable via UI user)
 */
export type OrgType = 'cabinet' | 'client' | 'group' | 'platform'

/** Organisation de type "group" (superviseur, ex: DCSSI) */
export function isGroupOrg(org: Pick<Organization, 'types'>): boolean {
  return org.types.includes('group')
}

/** Organisation de type "platform" (super-admin Gëstu, gestion plateforme) */
export function isPlatformOrg(org: Pick<Organization, 'types'>): boolean {
  return org.types.includes('platform')
}

/** Organisation de type "cabinet" (peut créer des missions, auditer) */
export function isCabinetOrg(org: Pick<Organization, 'types'>): boolean {
  return org.types.includes('cabinet')
}

/** Organisation de type "client" (entité auditée) */
export function isClientOrg(org: Pick<Organization, 'types'>): boolean {
  return org.types.includes('client')
}

// isSubsidiaryOrg retiré (RFC 0007 P4b) : la qualité de filiale se dérive du GRAPHE
// (arête group_ownership entrante), plus de la colonne parent_org_id supprimée.
// Voir useOrgRoles.graphIsSubsidiary / hierarchyGraph.fetchParentOrgId.

/** Organisation qui cumule groupe + cabinet (ex: DCSSI qui audite ET supervise) */
export function isGroupCabinetOrg(org: Pick<Organization, 'types'>): boolean {
  return org.types.includes('group') && org.types.includes('cabinet')
}

/** Label lisible du type d'organisation */
export function getOrgTypeLabel(org: Pick<Organization, 'types'>): string {
  if (isPlatformOrg(org)) return 'Plateforme'
  if (isGroupOrg(org) && isCabinetOrg(org)) return 'Groupe & Cabinet'
  if (isGroupOrg(org)) return 'Groupe'
  if (isCabinetOrg(org)) return 'Cabinet'
  if (isClientOrg(org)) return 'Client'
  return 'Organisation'
}
