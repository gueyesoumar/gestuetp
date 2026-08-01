import { type RGB, BLUE, BORDER, GOLD_500, ORANGE, RED, TEXT_400, TEXT_500, WHITE } from './colors'
import type { AssessmentWithControl, DocContext, DomainStat } from './context'
import { fillRect, fillRounded, setText, strokeRounded } from './primitives'

// ── Visuels ───────────────────────────────────────────────────────────────

export function drawRadarChart(ctx: DocContext, x: number, y: number, size: number, stats: DomainStat[]): void {
  const { doc } = ctx
  const cx = x + size / 2
  const cy = y + size / 2
  const radius = (size / 2) - 14
  const n = Math.max(3, stats.length)

  // Anneaux 25/50/75/100
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  for (const ratio of [0.25, 0.5, 0.75, 1]) {
    const r = radius * ratio
    const pts: [number, number][] = []
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2
      pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
    }
    doc.lines(pts.slice(1).map((p, i) => [p[0] - pts[i][0], p[1] - pts[i][1]]), pts[0][0], pts[0][1], [1, 1], 'S', true)
  }

  // Axes + labels
  setText(doc, TEXT_500, 7, 'bold')
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const ex = cx + radius * Math.cos(angle)
    const ey = cy + radius * Math.sin(angle)
    doc.setDrawColor(...BORDER)
    doc.line(cx, cy, ex, ey)
    const label = stats[i]?.code ?? ''
    const lx = cx + (radius + 6) * Math.cos(angle)
    const ly = cy + (radius + 6) * Math.sin(angle) + 1
    doc.text(label, lx, ly, { align: 'center' })
  }

  // Polygone scores
  const dataPts: [number, number][] = stats.map((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2
    const r = (radius * d.score) / 100
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  })
  if (dataPts.length >= 3) {
    doc.setFillColor(212, 168, 67)
    doc.setDrawColor(...GOLD_500)
    doc.setLineWidth(0.7)
    doc.saveGraphicsState()
    doc.setGState(new (doc as unknown as { GState: new (s: { opacity: number }) => unknown }).GState({ opacity: 0.25 }))
    doc.lines(
      dataPts.slice(1).map((p, i) => [p[0] - dataPts[i][0], p[1] - dataPts[i][1]]),
      dataPts[0][0], dataPts[0][1], [1, 1], 'F', true,
    )
    doc.restoreGraphicsState()
    doc.lines(
      dataPts.slice(1).map((p, i) => [p[0] - dataPts[i][0], p[1] - dataPts[i][1]]),
      dataPts[0][0], dataPts[0][1], [1, 1], 'S', true,
    )
    // Points
    doc.setFillColor(...GOLD_500)
    for (const p of dataPts) doc.circle(p[0], p[1], 1.3, 'F')
  }

  // Légende graduations
  setText(doc, TEXT_400, 6.5, 'normal')
  doc.text('100', cx + 1, cy - radius - 1)
  doc.text('50', cx + 1, cy - radius * 0.5 - 1)
}

export function drawPriorityMatrix(ctx: DocContext, x: number, y: number, w: number, h: number, items: AssessmentWithControl[]): void {
  const { doc } = ctx
  // Cadre
  fillRounded(doc, x, y, w, h, 2, WHITE)
  strokeRounded(doc, x, y, w, h, 2, BORDER, 0.5)

  const padL = 16, padR = 6, padT = 14, padB = 14
  const ix = x + padL, iy = y + padT
  const iw = w - padL - padR, ih = h - padT - padB

  // Quadrants
  fillRect(doc, ix, iy, iw / 2, ih / 2, [251, 247, 235]) // top-left = quick wins (gold tint)
  fillRect(doc, ix + iw / 2, iy, iw / 2, ih / 2, [240, 253, 244]) // top-right = strategic
  fillRect(doc, ix, iy + ih / 2, iw / 2, ih / 2, [243, 244, 246]) // bottom-left = fillers
  fillRect(doc, ix + iw / 2, iy + ih / 2, iw / 2, ih / 2, [254, 242, 242]) // bottom-right = thankless

  // Croix axes
  doc.setDrawColor(...TEXT_400)
  doc.setLineWidth(0.4)
  doc.line(ix, iy + ih / 2, ix + iw, iy + ih / 2)
  doc.line(ix + iw / 2, iy, ix + iw / 2, iy + ih)

  // Axes labels
  setText(doc, TEXT_500, 6.5, 'bold')
  doc.text('IMPACT ↑', x + 4, y + 10)
  doc.text('EFFORT →', x + w - 4, y + h - 5, { align: 'right' })

  // Quadrants labels
  setText(doc, TEXT_500, 7, 'bold')
  doc.text('Quick wins', ix + 2, iy + 5)
  doc.text('Stratégique', ix + iw - 2, iy + 5, { align: 'right' })
  doc.text('Faible enjeu', ix + 2, iy + ih - 2)
  doc.text('Coûteux', ix + iw - 2, iy + ih - 2, { align: 'right' })

  // Items dots — heuristique enrichie pour mieux étaler la nuée :
  //   IMPACT = base par classification + bonus si NC sur domaine bas score
  //   EFFORT = longueur de la reco + hash control_id pour étaler horizontalement
  // Bornes [0.08 ; 0.92] pour éviter les bords. Ajout de jitter déterministe
  // pour distinguer les points qui retomberaient sur les mêmes coordonnées.
  const domainScoreById = new Map<string, number>()
  for (const d of ctx.data.domainStats) {
    const dom = ctx.data.domains.find((dd) => dd.code === d.code)
    for (const c of dom?.controls ?? []) domainScoreById.set(c.id, d.score)
  }
  for (const a of items) {
    const baseImpact = a.finding_classification === 'major_nc' ? 0.85
      : a.finding_classification === 'minor_nc' ? 0.55
      : a.finding_classification === 'observation' ? 0.30
      : 0.5
    const domScore = domainScoreById.get(a.control_id) ?? 75
    // Domaine peu mature → impact bonus (la reco aura plus de levier)
    const domBonus = (100 - domScore) / 400 // 0..0.25
    const jitterImpact = ((hashStr(a.id + 'i') % 20) - 10) / 200 // ±0.05
    const impact = clamp01(baseImpact + domBonus + jitterImpact)

    const recoLen = (a.recommendations ?? '').length
    const baseEffort = clamp01(0.25 + recoLen / 700)
    const jitterEffort = ((hashStr(a.id + 'e') % 40) - 20) / 200 // ±0.10
    const effort = clamp01(baseEffort + jitterEffort)

    const px = ix + iw * Math.max(0.08, Math.min(0.92, effort))
    const py = iy + ih * (1 - Math.max(0.08, Math.min(0.92, impact)))
    const color: RGB = a.finding_classification === 'major_nc' ? RED
      : a.finding_classification === 'minor_nc' ? ORANGE : BLUE
    doc.setFillColor(...color); doc.circle(px, py, 1.6, 'F')
  }
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}
