import { BORDER, FOREST_900, GOLD_500, TEXT_500, WATERMARK_GRAY } from './colors'
import type { DocContext } from './context'

// ── Pagination ─────────────────────────────────────────────────────────────

export function checkPage(ctx: DocContext, needed: number): void {
  if (ctx.y + needed > ctx.pageH - 22) {
    ctx.doc.addPage()
    ctx.y = 22
    ctx.sectionByPage.set(ctx.doc.getCurrentPageInfo().pageNumber, ctx.currentSection)
  }
}

export function newSection(ctx: DocContext, num: string, title: string): void {
  ctx.doc.addPage()
  ctx.y = 22
  ctx.currentSection = `${num} ${title}`
  const pn = ctx.doc.getCurrentPageInfo().pageNumber
  ctx.sectionByPage.set(pn, ctx.currentSection)
  ctx.tocAnchors.push({ num, title, page: pn })
}

export function setPageContext(ctx: DocContext, label: string): void {
  ctx.currentSection = label
  ctx.sectionByPage.set(ctx.doc.getCurrentPageInfo().pageNumber, label)
}

// ── Header / Footer / Watermark — appliqués à la fin ──────────────────────

export function finalizeHeadersFooters(ctx: DocContext): void {
  const total = ctx.doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    if (ctx.bareCoverPages.has(p)) continue
    ctx.doc.setPage(p)
    drawWatermark(ctx)
    drawPageHeader(ctx, p, total)
    drawPageFooter(ctx, p, total)
  }
  ctx.doc.setPage(total)
}

function drawWatermark(ctx: DocContext): void {
  const { doc, pageW, pageH } = ctx
  doc.saveGraphicsState()
  doc.setGState(new (doc as unknown as { GState: new (s: { opacity: number }) => unknown }).GState({ opacity: 0.07 }))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(70)
  doc.setTextColor(...WATERMARK_GRAY)
  doc.text('CONFIDENTIEL', pageW / 2, pageH / 2, { align: 'center', angle: 30 })
  doc.restoreGraphicsState()
}

function drawPageHeader(ctx: DocContext, _pageNum: number, _total: number): void {
  const { doc, pageW, marginL, marginR } = ctx
  // ligne or
  doc.setDrawColor(...GOLD_500)
  doc.setLineWidth(0.5)
  doc.line(marginL, 12, pageW - marginR, 12)
  // texte
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...FOREST_900)
  doc.text(ctx.data.cabinetName.toUpperCase(), marginL, 9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_500)
  const right = `Rapport ${ctx.reportRef}  ·  Confidentiel`
  doc.text(right, pageW - marginR, 9, { align: 'right' })
}

function drawPageFooter(ctx: DocContext, pageNum: number, total: number): void {
  const { doc, pageW, pageH, marginL, marginR } = ctx
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(marginL, pageH - 14, pageW - marginR, pageH - 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_500)
  const left = ctx.sectionByPage.get(pageNum) ?? ''
  doc.text(left, marginL, pageH - 9)
  doc.text(`${pageNum} / ${total}`, pageW - marginR, pageH - 9, { align: 'right' })
}
