/**
 * HubPage — app-shell du Hub : barre du haut (marque Gëstu ETP morphing ou
 * marque cabinet), cockpit orbital des produits, décomposition en pied. Verrouillé
 * à la hauteur d'écran (desktop) ; scroll interne autorisé sur mobile.
 */

import { useAuth } from '../hooks/useAuth'
import { useBranding } from '../features/branding/useBranding'
import { useComplyHubStats } from '../features/dashboard/useComplyHubStats'
import { VaultBackground } from '../components/vault/VaultBackground'
import { ParticleCanvas } from '../components/vault/ParticleCanvas'
import { FloatingOrbs } from '../components/vault/FloatingOrbs'
import { OrbitCockpit } from '../features/hub/OrbitCockpit'

export function HubPage(): JSX.Element {
  const { profile, signOut } = useAuth()
  const { branding } = useBranding()
  const { stats: complyStats } = useComplyHubStats()

  const isBranded = Boolean(branding)

  return (
    <VaultBackground>
      <ParticleCanvas />
      <FloatingOrbs />

      <div className="relative z-10 flex min-h-[100dvh] flex-col overflow-y-auto md:h-[100dvh] md:overflow-hidden">
        <OrbitCockpit
          selfScore={complyStats.conformityScore}
          profile={profile}
          onSignOut={signOut}
          isBranded={isBranded}
        />
      </div>
    </VaultBackground>
  )
}
