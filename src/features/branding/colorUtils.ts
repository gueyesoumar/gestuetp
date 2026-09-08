/**
 * Génère une palette de teintes (50, 100, 300, 500, 700, 900) à partir d'une
 * couleur primaire HEX en ajustant la luminosité HSL. Utilisé pour rebrander
 * la palette `forest` ou `gold` à partir de la couleur cabinet sans demander
 * au cabinet de fournir 6 nuances.
 *
 * Stratégie : la couleur fournie est traitée comme la "700" (couleur
 * dominante des boutons / surfaces actives). Les autres shades sont dérivés
 * en éclaircissant ou assombrissant.
 */

interface HSL {
  h: number
  s: number
  l: number
}

function hexToHsl(hex: string): HSL | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const r = parseInt(m[1].slice(0, 2), 16) / 255
  const g = parseInt(m[1].slice(2, 4), 16) / 255
  const b = parseInt(m[1].slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break
      case g: h = ((b - r) / d + 2); break
      default: h = ((r - g) / d + 4)
    }
    h *= 60
  }
  return { h, s: s * 100, l: l * 100 }
}

function hslToHex({ h, s, l }: HSL): string {
  const sat = Math.max(0, Math.min(100, s)) / 100
  const lum = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * lum - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lum - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  const toHex = (v: number): string => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

/**
 * Retourne la palette {50, 100, 300, 500, 700, 900} à partir d'une couleur
 * de référence. Chaque shade a une LUMINOSITÉ CIBLE FIXE (échelle type Tailwind) ;
 * seules la teinte et la saturation du cabinet sont préservées. Ainsi n'importe
 * quelle couleur (même claire) produit une échelle lisible : les shades foncés
 * (700/900, fonds de boutons/sidebar avec texte blanc) restent toujours assez
 * sombres pour un contraste correct. La couleur brute reste disponible via
 * --brand-primary / --brand-accent pour un usage direct.
 */
const TARGET_LIGHTNESS: Record<'50' | '100' | '300' | '500' | '700' | '900', number> = {
  '50': 96,
  '100': 89,
  '300': 70,
  '500': 48,
  '700': 28,
  '900': 16,
}

export function generatePalette(baseHex: string): Record<'50' | '100' | '300' | '500' | '700' | '900', string> | null {
  const hsl = hexToHsl(baseHex)
  if (!hsl) return null

  const out: Record<string, string> = {}
  for (const [shade, l] of Object.entries(TARGET_LIGHTNESS)) {
    out[shade] = hslToHex({ h: hsl.h, s: hsl.s, l })
  }
  return out as Record<'50' | '100' | '300' | '500' | '700' | '900', string>
}

/**
 * Couleur de texte lisible (blanc ou encre foncée) sur un fond donné, selon la
 * luminance relative (WCAG). Utile pour les surfaces peintes avec une couleur
 * de marque arbitraire.
 */
export function readableTextOn(hex: string): '#FFFFFF' | '#111827' {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#FFFFFF'
  const chan = (i: number): number => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const lum = 0.2126 * chan(0) + 0.7152 * chan(2) + 0.0722 * chan(4)
  // Seuil ~0.4 : au-dessus le fond est clair → texte foncé.
  return lum > 0.4 ? '#111827' : '#FFFFFF'
}
