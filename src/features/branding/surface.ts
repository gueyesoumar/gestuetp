import type { CabinetBranding } from './BrandingContext'
import type { BrandSurfaceMode } from './extractColorsFromImage'

// Écran surchargeable pour la polarité de surface.
export type BrandScreen = 'login' | 'hub' | 'portal'

// Valeur d'un sélecteur de surcharge par écran : 'auto' = hérite du global.
export type SurfaceOverride = 'auto' | BrandSurfaceMode

export function resolveOverride(o: SurfaceOverride, global: BrandSurfaceMode): BrandSurfaceMode {
  return o === 'auto' ? global : o
}

/**
 * Polarité effective d'un écran : surcharge par écran si définie, sinon la
 * polarité globale du cabinet, sinon 'dark' par défaut.
 */
export function effectiveSurface(branding: CabinetBranding, screen: BrandScreen): BrandSurfaceMode {
  const override =
    screen === 'login' ? branding.login_surface_mode
    : screen === 'hub' ? branding.hub_surface_mode
    : branding.portal_surface_mode
  return override ?? branding.brand_surface_mode ?? 'dark'
}
