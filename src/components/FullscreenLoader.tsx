import { useBranding } from '../features/branding/useBranding'
import { VaultBackground } from './vault/VaultBackground'

// Loader plein écran adaptatif. Par défaut (Gëstu ou cabinet à surface sombre) :
// fond « vault » branché. Pour un cabinet à logo foncé (brand_surface_mode
// 'light') : fond clair dégradé — évite tout flash de couleur avant le rendu de
// la destination claire (hub, portail…).

export function FullscreenLoader(): JSX.Element {
  const { branding } = useBranding()
  const isLight = branding?.brand_surface_mode === 'light'

  if (isLight) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #FFFFFF 0%, color-mix(in srgb, var(--brand-primary) 6%, #FFFFFF) 100%)' }}
      >
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-[rgb(17_24_39/0.25)] border-t-transparent"
          role="status"
          aria-label="Chargement"
        />
      </div>
    )
  }

  return (
    <VaultBackground>
      <div className="flex min-h-[100dvh] items-center justify-center">
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-white/40 border-t-transparent"
          role="status"
          aria-label="Chargement"
        />
      </div>
    </VaultBackground>
  )
}
