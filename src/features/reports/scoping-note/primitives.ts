import type jsPDF from 'jspdf'
import {
  type RGB, BG, BORDER, FOREST_700, GOLD_50, GOLD_500, FOREST_50, TEXT_400, TEXT_500,
  TEXT_700, TEXT_900, WHITE,
} from './colors'
import type { DocContext } from './context'

// ── Pagination helpers ─────────────────────────────────────────────────────

export function checkPage(ctx: DocContext, needed: number): void {
  if (ctx.y + needed > ctx.pageH - 18) {
    addPageNum(ctx)
    ctx.doc.addPage()
    ctx.y = 18
  }
}

export function addPageNum(ctx: DocContext): void {
  const total = ctx.doc.getNumberOfPages()
  ctx.doc.setFontSize(7.5)
  ctx.doc.setTextColor(...TEXT_400)
  ctx.doc.text(`${total}`, ctx.pageW - ctx.marginR, ctx.pageH - 8, { align: 'right' })
}

// ── Drawing primitives ─────────────────────────────────────────────────────

export function fillRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: RGB): void {
  doc.setFillColor(...color)
  doc.rect(x, y, w, h, 'F')
}

export function fillRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, color: RGB): void {
  doc.setFillColor(...color)
  doc.roundedRect(x, y, w, h, r, r, 'F')
}

export function strokeRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, color: RGB, lineWidth = 0.3): void {
  doc.setDrawColor(...color)
  doc.setLineWidth(lineWidth)
  doc.roundedRect(x, y, w, h, r, r, 'S')
}

export function setText(doc: jsPDF, color: RGB, size: number, weight: 'normal' | 'bold' = 'normal'): void {
  doc.setFontSize(size)
  doc.setFont('helvetica', weight)
  doc.setTextColor(...color)
}

// Wrap text and write line by line, paginating as needed.
export function writeWrapped(ctx: DocContext, text: string, opts: { size?: number; color?: RGB; lineHeight?: number; weight?: 'normal' | 'bold'; indent?: number } = {}): void {
  const { size = 9.5, color = TEXT_700, lineHeight = 4.6, weight = 'normal', indent = 0 } = opts
  setText(ctx.doc, color, size, weight)
  const lines = ctx.doc.splitTextToSize(text, ctx.contentW - indent) as string[]
  for (const line of lines) {
    checkPage(ctx, lineHeight)
    ctx.doc.text(line, ctx.marginL + indent, ctx.y)
    ctx.y += lineHeight
  }
}

export function drawKpi(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, sub: string): void {
  setText(doc, TEXT_500, 7, 'bold')
  doc.text(label.toUpperCase(), x + 5, y + 6)
  setText(doc, FOREST_700, 18, 'bold')
  doc.text(value, x + 5, y + 17)
  setText(doc, TEXT_500, 7.5, 'normal')
  doc.text(sub, x + 5, y + 23)
  // Vertical separator
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(x + w, y + 3, x + w, y + h - 3)
}

// ── Section banner ─────────────────────────────────────────────────────────

export function drawSectionBanner(ctx: DocContext, num: string, title: string, lead: string): void {
  ctx.doc.addPage()
  ctx.y = 0
  // Banner background
  fillRect(ctx.doc, 0, 0, ctx.pageW, 32, FOREST_700)
  fillRect(ctx.doc, 0, 31.5, ctx.pageW, 0.7, GOLD_500)
  setText(ctx.doc, GOLD_500, 7, 'bold')
  ctx.doc.text(num.toUpperCase(), ctx.marginL, 11)
  setText(ctx.doc, WHITE, 18, 'bold')
  ctx.doc.text(title, ctx.marginL, 21)
  setText(ctx.doc, [220, 220, 220], 8.5, 'normal')
  const leadLines = ctx.doc.splitTextToSize(lead, ctx.contentW) as string[]
  if (leadLines.length > 0) ctx.doc.text(leadLines[0], ctx.marginL, 28)
  ctx.y = 42
}

export function drawH3(ctx: DocContext, title: string): void {
  checkPage(ctx, 10)
  ctx.y += 3
  setText(ctx.doc, FOREST_700, 11, 'bold')
  ctx.doc.text(title, ctx.marginL, ctx.y)
  ctx.y += 5
}

export function drawCallout(ctx: DocContext, title: string, text: string, accent: 'forest' | 'gold' = 'gold'): void {
  setText(ctx.doc, TEXT_700, 9, 'normal')
  const lines = ctx.doc.splitTextToSize(text, ctx.contentW - 10) as string[]
  const h = 8 + lines.length * 4 + 4
  checkPage(ctx, h + 4)
  const accentColor = accent === 'gold' ? GOLD_500 : FOREST_700
  const bgColor = accent === 'gold' ? GOLD_50 : FOREST_50
  fillRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, h, 1.5, bgColor)
  fillRect(ctx.doc, ctx.marginL, ctx.y, 1, h, accentColor)
  setText(ctx.doc, accentColor, 7.5, 'bold')
  ctx.doc.text(title.toUpperCase(), ctx.marginL + 5, ctx.y + 5.5)
  setText(ctx.doc, TEXT_700, 9, 'normal')
  let ly = ctx.y + 11
  for (const line of lines) {
    ctx.doc.text(line, ctx.marginL + 5, ly)
    ly += 4
  }
  ctx.y += h + 3
}

export function drawSignatureCard(ctx: DocContext, x: number, y: number, w: number, h: number, role: string, name: string, fn: string): void {
  fillRoundedRect(ctx.doc, x, y, w, h, 1.5, WHITE)
  strokeRoundedRect(ctx.doc, x, y, w, h, 1.5, BORDER)
  setText(ctx.doc, GOLD_500, 7.5, 'bold')
  ctx.doc.text(role.toUpperCase(), x + 4, y + 6)
  setText(ctx.doc, TEXT_900, 10, 'bold')
  ctx.doc.text(name, x + 4, y + 12)
  setText(ctx.doc, TEXT_500, 8, 'normal')
  const fnLines = ctx.doc.splitTextToSize(fn, w - 8) as string[]
  if (fnLines.length > 0) ctx.doc.text(fnLines[0], x + 4, y + 16)
  // Signature line
  ctx.doc.setDrawColor(...BORDER)
  ctx.doc.setLineWidth(0.3)
  ctx.doc.line(x + 4, y + h - 12, x + w - 4, y + h - 12)
  setText(ctx.doc, TEXT_500, 7.5, 'normal')
  ctx.doc.text('Date : ___ / ___ / ____', x + 4, y + h - 7)
  ctx.doc.text('Signature et cachet', x + 4, y + h - 3)
}

// ── Generic table ──────────────────────────────────────────────────────────

export function drawTable(ctx: DocContext, headers: string[], rows: string[][]): void {
  const colW = ctx.contentW / headers.length
  const headerH = 7
  checkPage(ctx, headerH + 7)
  // Header row
  fillRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, headerH, BG)
  setText(ctx.doc, TEXT_500, 7.5, 'bold')
  for (let i = 0; i < headers.length; i++) {
    ctx.doc.text(headers[i].toUpperCase(), ctx.marginL + i * colW + 3, ctx.y + 4.7)
  }
  ctx.y += headerH

  // Data rows
  for (const row of rows) {
    setText(ctx.doc, TEXT_700, 9, 'normal')
    // Compute max line height
    let maxLines = 1
    const wrapped: string[][] = row.map((cell) => {
      const lines = ctx.doc.splitTextToSize(cell, colW - 6) as string[]
      maxLines = Math.max(maxLines, lines.length)
      return lines.slice(0, 3)
    })
    const rowH = Math.max(6, maxLines * 4 + 2)
    checkPage(ctx, rowH + 1)
    // Border bottom
    ctx.doc.setDrawColor(...BORDER)
    ctx.doc.setLineWidth(0.2)
    ctx.doc.line(ctx.marginL, ctx.y + rowH, ctx.marginL + ctx.contentW, ctx.y + rowH)
    // Cell text
    for (let i = 0; i < wrapped.length; i++) {
      let ly = ctx.y + 4.5
      for (const line of wrapped[i]) {
        ctx.doc.text(line, ctx.marginL + i * colW + 3, ly)
        ly += 4
      }
    }
    ctx.y += rowH
  }
  ctx.y += 2
}
