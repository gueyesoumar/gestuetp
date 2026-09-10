/**
 * Kit partagé des aperçus marque blanche : type de contexte calculé depuis le
 * draft + utilitaires couleur. Le composant logo est dans LogoPreview.tsx.
 */
import { readableTextOn } from '../../../branding/colorUtils'
import type { DarkLogoTreatment, BrandSurfaceMode } from '../../../branding/extractColorsFromImage'

export interface PreviewCtx {
  cabinetName: string
  primary: string      // shade 700 (accents sur clair, éléments moyens)
  primaryDeep: string  // shade 900 (panneau formulaire, surfaces sombres)
  lightSurface: string // shade 50 (fond clair de marque)
  accent: string
  surfaceMode: BrandSurfaceMode
  treatment: DarkLogoTreatment
  logoLight: string | null
  logoDark: string | null
}

export function isHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

// Mélange une couleur hex vers noir/blanc, ratio [0,1].
export function mix(hex: string, target: 'black' | 'white', ratio: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const t = target === 'black' ? 0 : 255
  const toHex = (n: number): string => Math.round(n * (1 - ratio) + t * ratio).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function accentTextColor(accent: string): string {
  return isHex(accent) ? readableTextOn(accent) : '#1A1F1D'
}
