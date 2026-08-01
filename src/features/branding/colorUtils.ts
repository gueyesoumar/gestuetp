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
 * de référence (traitée comme shade 700). Les autres shades sont calculés
 * par décalage de luminosité.
 */
export function generatePalette(baseHex: string): Record<'50' | '100' | '300' | '500' | '700' | '900', string> | null {
  const hsl = hexToHsl(baseHex)
  if (!hsl) return null

  // Décalages relatifs depuis la base (700)
  // Inspirés de la palette Tailwind / charte Gestu existante
  const shifts: Record<'50' | '100' | '300' | '500' | '700' | '900', number> = {
    '50': +50,
    '100': +40,
    '300': +20,
    '500': +10,
    '700': 0,
    '900': -10,
  }

  const out: Record<string, string> = {}
  for (const [shade, delta] of Object.entries(shifts)) {
    const newL = hsl.l + delta
    out[shade] = hslToHex({ h: hsl.h, s: hsl.s, l: newL })
  }
  return out as Record<'50' | '100' | '300' | '500' | '700' | '900', string>
}
