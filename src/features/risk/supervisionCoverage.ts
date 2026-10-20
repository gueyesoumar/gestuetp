import type { PortfolioOrg } from './useSupervisedPortfolio'
import type { SupervisionAssignment } from './useSupervisionAssignments'

// Couverture d'affectation : une org est couverte si une affectation la vise par
// org (scope_org_id) OU par secteur (scope_label). Logique centralisee (reutilisee
// par le cockpit et la page Affectations) pour eviter la duplication du set-difference.

export function isOrgCovered(org: PortfolioOrg, assignments: SupervisionAssignment[]): boolean {
  return assignments.some((a) =>
    (a.scope_type === 'org' && a.scope_org_id === org.organization_id)
    || (a.scope_type === 'sector' && a.scope_label === org.sector))
}

export function uncoveredOrgs(orgs: PortfolioOrg[], assignments: SupervisionAssignment[]): PortfolioOrg[] {
  return orgs.filter((o) => !isOrgCovered(o, assignments))
}
