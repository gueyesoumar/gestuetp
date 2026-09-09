/**
 * Extraction des couleurs dominantes d'une image (côté client, sans dépendance).
 *
 * Charge le fichier dans un canvas 100×100, filtre les pixels transparents /
 * trop blancs / trop noirs / trop gris, quantize en buckets de 16 par canal,
 * et retourne les deux couleurs les plus fréquentes (primary, accent).
 *
 * Fonctionne avec PNG et SVG (le browser rasterise le SVG dans le canvas).
 * Retourne null si l'image ne contient pas assez de pixels colorés (ex: logo
 * 100 % monochrome noir sur transparent — dans ce cas pas de suggestion).
 */

export type DarkLogoTreatment = 'direct' | 'whiten' | 'chip'
export type BrandSurfaceMode = 'light' | 'dark'

export interface ExtractedColors {
  primary: string
  accent: string
  /** Rendu conseillé du logo sur fond sombre (déduit de l'analyse). */
  treatment: DarkLogoTreatment
  /** Le logo a-t-il un fond transparent (marques détourées) ? */
  hasTransparency: boolean
  /** Polarité conseillée des surfaces brandées pour poser le logo tel quel. */
  surfaceMode: BrandSurfaceMode
}

export function extractColorsFromImage(file: File): Promise<ExtractedColors | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.crossOrigin = 'anonymous'

    const cleanup = () => URL.revokeObjectURL(url)

    img.onload = () => {
      try {
        const W = 100
        const H = 100
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) { cleanup(); resolve(null); return }
        ctx.drawImage(img, 0, 0, W, H)
        const { data } = ctx.getImageData(0, 0, W, H)
        const result = analyze(data)
        cleanup()
        resolve(result)
      } catch (err) {
        console.warn('[extractColors] erreur:', err instanceof Error ? err.message : err)
        cleanup()
        resolve(null)
      }
    }
    img.onerror = () => { cleanup(); resolve(null) }
    img.src = url
  })
}

interface Bucket { rSum: number; gSum: number; bSum: number; count: number }

function analyze(data: Uint8ClampedArray): ExtractedColors | null {
  const buckets = new Map<string, Bucket>()
  // Stats des « marques » (pixels opaques non quasi-blancs = le logo lui-même).
  let markLumSum = 0, markCount = 0, markR = 0, markG = 0, markB = 0
  let hasTransparency = false

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    if (a < 200) { hasTransparency = true; continue }
    const nearWhite = r > 240 && g > 240 && b > 240
    if (!nearWhite) {
      markLumSum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      markR += r; markG += g; markB += b; markCount++
    }
    // Buckets de couleurs saturées → primary/accent
    if (nearWhite) continue
    if (r < 20 && g < 20 && b < 20) continue
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    if (max - min < 20) continue
    const qr = Math.round(r / 16) * 16, qg = Math.round(g / 16) * 16, qb = Math.round(b / 16) * 16
    const key = `${qr}-${qg}-${qb}`
    const existing = buckets.get(key)
    if (existing) { existing.rSum += r; existing.gSum += g; existing.bSum += b; existing.count++ }
    else buckets.set(key, { rSum: r, gSum: g, bSum: b, count: 1 })
  }

  if (markCount === 0) return null // image vide / entièrement transparente

  const markLum = markLumSum / markCount // 0 (foncé) → 1 (clair)

  const sorted = Array.from(buckets.values())
    .filter((bk) => bk.count >= 3)
    .sort((a, b) => b.count - a.count)

  let primary: string, accent: string
  if (sorted.length > 0) {
    primary = bucketToHex(sorted[0])
    const candidate = sorted.find((bk, idx) => idx > 0 && colorDistance(bk, sorted[0]) > 60)
    accent = candidate ? bucketToHex(candidate) : shiftLightness(primary, 22)
  } else {
    // Logo sans couleur saturée (mono gris/noir) : repli sur la couleur moyenne des marques.
    primary = rgbToHex(Math.round(markR / markCount), Math.round(markG / markCount), Math.round(markB / markCount))
    accent = shiftLightness(primary, 25)
  }

  // Nombre de couleurs saturées distinctes (multicolore ?)
  const distinctColors = sorted.length === 0
    ? 0
    : 1 + sorted.filter((bk, i) => i > 0 && colorDistance(bk, sorted[0]) > 60).length

  // Traitement conseillé sur fond sombre
  let treatment: DarkLogoTreatment
  if (markLum > 0.6) treatment = 'direct'          // marques claires → se fondent
  else if (distinctColors >= 2) treatment = 'chip' // multicolore → pastille (préserve les couleurs)
  else treatment = 'whiten'                         // monochrome foncé → silhouette blanche

  // Polarité de surface : marques claires → fond sombre ; marques foncées → fond clair.
  // Ainsi le logo est posé tel quel (transparent, couleurs d'origine), sans pastille.
  const surfaceMode: BrandSurfaceMode = markLum > 0.6 ? 'dark' : 'light'

  return { primary, accent, treatment, hasTransparency, surfaceMode }
}

function bucketToHex(b: Bucket): string {
  const r = Math.round(b.rSum / b.count)
  const g = Math.round(b.gSum / b.count)
  const bl = Math.round(b.bSum / b.count)
  return rgbToHex(r, g, bl)
}

function colorDistance(a: Bucket, b: Bucket): number {
  const ar = a.rSum / a.count, ag = a.gSum / a.count, ab = a.bSum / a.count
  const br = b.rSum / b.count, bg = b.gSum / b.count, bb = b.bSum / b.count
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2)
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Décale la luminosité d'une couleur hex (delta dans [-100, 100]) */
function shiftLightness(hex: string, delta: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const adjust = (n: number) => Math.round(n + (delta * 255) / 100)
  return rgbToHex(adjust(r), adjust(g), adjust(b))
}
