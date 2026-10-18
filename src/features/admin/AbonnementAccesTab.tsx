import { EntitlementConsole } from './entitlements/EntitlementConsole'
import { CabinetFeatureFlagsTab } from './CabinetFeatureFlagsTab'

/**
 * Surface unique « Abonnement et acces » (RFC 0018 Phase 4).
 * Fusionne l'ancien onglet « Abonnement » (modules + quotas, pile org_entitlements)
 * et l'ancien onglet « Fonctionnalites » (flags) en une seule page :
 *   Modules / Quotas / Autres droits   puis   Fonctionnalites.
 * Chaque section conserve son propre chemin d'ecriture (edges admin-entitlement et
 * admin-feature-flag-overrides) ; la fusion est UI (D4-a option A).
 */
export function AbonnementAccesTab({ cabinetId }: { cabinetId: string }) {
  return (
    <div className="space-y-8">
      <EntitlementConsole cabinetId={cabinetId} />

      <section>
        <header className="mb-4 pt-2 border-t border-gray-200">
          <h2 className="text-[15px] font-bold text-gray-900 pt-4">Fonctionnalités</h2>
          <p className="text-[11.5px] text-gray-500">Fonctionnalités fines activées par le plan ou surchargées pour cette organisation.</p>
        </header>
        <CabinetFeatureFlagsTab cabinetId={cabinetId} />
      </section>
    </div>
  )
}
