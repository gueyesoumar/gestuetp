import { useBranding } from './useBranding'

/**
 * Logo cabinet (Option D dual-logo).
 *
 *   variant = 'light' : surface claire — utilise logo_light_url tel quel
 *   variant = 'dark'  : surface sombre — préfère logo_dark_url, fallback en
 *                       pastille blanche autour de logo_light_url si absent.
 *
 * Si aucun branding cabinet n'est résolu (mode Gëstu), on n'affiche rien :
 * les pages de login/hub utilisent leurs propres composants Vault. Le caller
 * doit conditionner l'affichage sur isCustomDomain.
 */

interface LogoProps {
  variant: 'light' | 'dark'
  height?: number
  className?: string
}

export function Logo({ variant, height = 40, className }: LogoProps): JSX.Element | null {
  const { branding } = useBranding()
  if (!branding) return null

  const lightUrl = branding.logo_light_url
  const darkUrl = branding.logo_dark_url

  if (variant === 'light') {
    if (!lightUrl) return null
    return (
      <img
        src={lightUrl}
        alt={branding.cabinet_name}
        style={{ height, width: 'auto', maxWidth: 240, display: 'block' }}
        className={className}
      />
    )
  }

  // variant === 'dark' — sur fond sombre / coloré
  if (darkUrl) {
    return (
      <img
        src={darkUrl}
        alt={branding.cabinet_name}
        style={{ height, width: 'auto', maxWidth: 240, display: 'block' }}
        className={className}
      />
    )
  }

  // Fallback : pastille blanche autour du logo light (Option D)
  if (lightUrl) {
    const padding = Math.round(height * 0.18)
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
          borderRadius: Math.round(height * 0.22),
          padding: `${padding}px ${padding * 1.4}px`,
        }}
        className={className}
      >
        <img
          src={lightUrl}
          alt={branding.cabinet_name}
          style={{ height: height - padding * 2, width: 'auto', maxWidth: 200, display: 'block' }}
        />
      </span>
    )
  }

  return null
}
