import type jsPDF from 'jspdf'
import { type RGB, BORDER, CREAM, FOREST_900, FOREST_700, GOLD_500, TEXT_500, TEXT_700, WHITE } from './colors'
import type { DocContext } from './context'
import { checkPage, newSection } from './page-chrome'

// ── Drawing primitives ─────────────────────────────────────────────────────

export function fillRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: RGB): void {
  doc.setFillColor(...color); doc.rect(x, y, w, h, 'F')
}
export function fillRounded(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, color: RGB): void {
  doc.setFillColor(...color); doc.roundedRect(x, y, w, h, r, r, 'F')
}
export function strokeRounded(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, color: RGB, lw = 0.3): void {
  doc.setDrawColor(...color); doc.setLineWidth(lw); doc.roundedRect(x, y, w, h, r, r, 'S')
}
export function setText(doc: jsPDF, color: RGB, size: number, weight: 'normal' | 'bold' = 'normal'): void {
  doc.setFontSize(size); doc.setFont('helvetica', weight); doc.setTextColor(...color)
}

export function writeWrapped(ctx: DocContext, text: string, opts: { size?: number; color?: RGB; lineHeight?: number; weight?: 'normal' | 'bold'; indent?: number; bottomGap?: number } = {}): void {
  const { size = 9.8, color = TEXT_700, lineHeight = 4.9, weight = 'normal', indent = 0, bottomGap = 0 } = opts
  setText(ctx.doc, color, size, weight)
  const lines = ctx.doc.splitTextToSize(text, ctx.contentW - indent) as string[]
  for (const line of lines) {
    checkPage(ctx, lineHeight)
    ctx.doc.text(line, ctx.marginL + indent, ctx.y)
    ctx.y += lineHeight
  }
  ctx.y += bottomGap
}

export function writeParagraphs(ctx: DocContext, paragraphs: string[], opts?: { gap?: number }): void {
  const gap = opts?.gap ?? 3
  for (const p of paragraphs) {
    writeWrapped(ctx, p, { size: 9.8, lineHeight: 5, color: TEXT_700 })
    ctx.y += gap
  }
}

export function drawSectionBanner(ctx: DocContext, num: string, title: string, lead: string): void {
  newSection(ctx, num, title)
  const { doc, marginL, contentW } = ctx
  // Bandeau plein
  fillRect(doc, marginL, ctx.y, contentW, 28, ctx.palette.primary)
  // accent or
  fillRect(doc, marginL, ctx.y + 28, contentW, 1.5, ctx.palette.accent)
  // Numéro géant
  setText(doc, GOLD_500, 28, 'bold')
  doc.text(num, marginL + 8, ctx.y + 20)
  // Titre
  setText(doc, WHITE, 16, 'bold')
  doc.text(title, marginL + 32, ctx.y + 14)
  setText(doc, [200, 220, 210], 9, 'normal')
  const ll = doc.splitTextToSize(lead, contentW - 38) as string[]
  doc.text(ll[0] ?? '', marginL + 32, ctx.y + 21)
  ctx.y += 38
}

export function drawH3(ctx: DocContext, title: string): void {
  checkPage(ctx, 10)
  setText(ctx.doc, FOREST_900, 11.5, 'bold')
  ctx.doc.text(title, ctx.marginL, ctx.y)
  // souligné court doré
  ctx.doc.setDrawColor(...GOLD_500)
  ctx.doc.setLineWidth(0.6)
  const w = ctx.doc.getTextWidth(title)
  ctx.doc.line(ctx.marginL, ctx.y + 1.4, ctx.marginL + Math.min(w, 30), ctx.y + 1.4)
  ctx.y += 7
}

export function drawKpi(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, sub: string, color: RGB = FOREST_700): void {
  fillRounded(doc, x, y, w, h, 2, WHITE)
  strokeRounded(doc, x, y, w, h, 2, BORDER, 0.4)
  fillRect(doc, x, y, w, 2, color)
  setText(doc, TEXT_500, 7.2, 'bold')
  doc.text(label.toUpperCase(), x + 4, y + 7)
  setText(doc, color, 22, 'bold')
  doc.text(value, x + 4, y + 18)
  setText(doc, TEXT_500, 7.5, 'normal')
  doc.text(sub, x + 4, y + h - 4)
}

export function drawTable(ctx: DocContext, headers: string[], rows: string[][], widths: number[]): void {
  const { doc, marginL } = ctx
  const headerH = 8, rowH = 6
  const totalW = widths.reduce((s, w) => s + w, 0)

  checkPage(ctx, headerH + rowH * Math.min(rows.length, 3))
  fillRect(doc, marginL, ctx.y, totalW, headerH, ctx.palette.primary)
  setText(doc, WHITE, 8, 'bold')
  let cx = marginL
  for (let i = 0; i < headers.length; i++) { doc.text(headers[i], cx + 4, ctx.y + 5.4); cx += widths[i] }
  ctx.y += headerH

  setText(doc, TEXT_700, 8, 'normal')
  let zebra = false
  for (const row of rows) {
    checkPage(ctx, rowH)
    if (zebra) fillRect(doc, marginL, ctx.y, totalW, rowH, CREAM)
    cx = marginL
    for (let i = 0; i < row.length; i++) { doc.text(row[i], cx + 4, ctx.y + 4); cx += widths[i] }
    ctx.y += rowH
    zebra = !zebra
  }
  ctx.y += 3
}
