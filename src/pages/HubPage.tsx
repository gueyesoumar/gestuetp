/**
 * HubPage — app-shell du Hub : barre du haut (marque + onglets de vue + user),
 * lanceur de produits (vue par défaut), vues posture / portefeuille. Fond vault
 * sombre, sans animation permanente (RFC Hub UX, direction D3).
 */

import type { CSSProperties } from 'react'
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
  // Polarité du chrome hub : clair pour un cabinet à logo foncé (surface light),
  // sombre sinon. --hub-fg pilote tout le premier plan des sous-composants.
  const isLight = isBranded && branding?.brand_surface_mode === 'light'

  const cockpit = (
    <HubCockpit selfScore={complyStats.conformityScore} profile={profile} onSignOut={signOut} isBranded={isBranded} />
  )

  if (isLight) {
    return (
      <div
        className="relative min-h-[100dvh] md:h-[100dvh]"
        style={{
          '--hub-fg': '17 24 39',
          '--hub-surface': '255 255 255',
          background: 'linear-gradient(160deg, #FFFFFF 0%, color-mix(in srgb, var(--brand-primary) 6%, #FFFFFF) 100%)',
        } as CSSProperties}
      >
        <div className="relative z-10 flex min-h-[100dvh] flex-col overflow-y-auto md:h-[100dvh] md:overflow-hidden">
          {cockpit}
        </div>
      </div>
    )
  }

  return (
    <VaultBackground>
      <div
        className="relative z-10 flex min-h-[100dvh] flex-col overflow-y-auto md:h-[100dvh] md:overflow-hidden"
        style={{ '--hub-fg': '255 255 255', '--hub-surface': '13 42 30' } as CSSProperties}
      >
        {cockpit}
      </div>
    </VaultBackground>
  )
}
