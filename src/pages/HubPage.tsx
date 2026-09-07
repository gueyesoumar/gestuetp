/**
 * HubPage — app-shell du Hub : barre du haut (marque + onglets de vue + user),
 * lanceur de produits (vue par défaut), vues posture / portefeuille. Fond vault
 * sombre, sans animation permanente (RFC Hub UX, direction D3).
 */

import { useAuth } from '../hooks/useAuth'
import { useBranding } from '../features/branding/useBranding'
import { useComplyHubStats } from '../features/dashboard/useComplyHubStats'
import { VaultBackground } from '../components/vault/VaultBackground'
import { HubCockpit } from '../features/hub/HubCockpit'

export function HubPage(): JSX.Element {
  const { profile, signOut } = useAuth()
  const { branding } = useBranding()
  const { stats: complyStats } = useComplyHubStats()

  const isBranded = Boolean(branding)

  return (
    <VaultBackground>
      <div className="relative z-10 flex min-h-[100dvh] flex-col overflow-y-auto md:h-[100dvh] md:overflow-hidden">
        <HubCockpit
          selfScore={complyStats.conformityScore}
          profile={profile}
          onSignOut={signOut}
          isBranded={isBranded}
        />
      </div>
    </VaultBackground>
  )
}
