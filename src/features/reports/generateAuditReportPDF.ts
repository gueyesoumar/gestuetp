import jsPDF from 'jspdf'
import type { MissionDetail, MissionMemberRow } from '../missions/useMissionDetail'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'
import type { CabinetClient, ControlAssessment } from '../../types/database.types'
import { ROLE_LABELS } from '../missions/mission-constants'
import {
  describeVerdict,
  generateContextNarrative,
  generateMethodologyNarrative,
  generateExecutiveNarrative,
  generateDomainNarrative,
  generateNCFactSheet,
  generateRecommendationNarrative,
  generateActionPlanNarrative,
  generateConclusionNarrative,
  generateExecutiveLetterBody,
  generateGlossary,
} from './auditReportNarratives'

/**
 * Rapport d'audit V2 — Niveau B (style Deloitte adapté charte Gëstu).
 * ~25-30 pages, narratif détaillé, fiches NC individuelles, radar
 * de maturité, matrice de priorisation impact × effort, annexes.
 *
 * Toutes les données proviennent de loadAuditReportData().
 */

// ── Types externes ─────────────────────────────────────────────────────────

export interface AssessmentWithControl extends ControlAssessment {
  control: { id: string; code: string; name: string; description: string | null; domain_id: string }
}

export interface ClientContact {
  id: string
  contact_name: string
  email: string
  job_title: string | null
  portal_status: string
}

export interface EvidenceDoc {
  id: string
  file_name: string
  document_type: string | null
  created_at: string
}

export interface AuditReportData {
  mission: MissionDetail
  members: MissionMemberRow[]
  domains: DomainWithControls[]
  assessments: AssessmentWithControl[]
  client: CabinetClient | null
  clientContacts: ClientContact[]
  cabinetName: string
  cabinetLogoUrl?: string | null
  cabinetLogoDarkUrl?: string | null
  cabinetAddress: string | null
  cabinetPhone: string | null
  cabinetWebsite: string | null
  cabinetSupportEmail: string | null
  cabinetFooterText: string | null
  evidenceDocs: EvidenceDoc[]
  /** Décoré par createContext, pas requis côté loader. */
  totals?: AuditTotals
  domainStats?: DomainStat[]
}

// ── Palette (Forest+Gold à hiérarchie Deloitte) ───────────────────────────

type RGB = [number, number, number]
const FOREST_900: RGB = [13, 47, 35]
const FOREST_800: RGB = [20, 56, 42]
const FOREST_700: RGB = [27, 67, 50]
const FOREST_500: RGB = [45, 106, 79]
const FOREST_50: RGB = [240, 253, 244]
const GOLD_500: RGB = [212, 168, 67]
const GOLD_50: RGB = [253, 248, 232]
const TEXT_900: RGB = [26, 26, 26]
const TEXT_800: RGB = [40, 45, 53]
const TEXT_700: RGB = [55, 65, 81]
const TEXT_500: RGB = [107, 114, 128]
const TEXT_400: RGB = [156, 163, 175]
const TEXT_300: RGB = [209, 213, 219]
const BORDER: RGB = [229, 231, 235]
const BORDER_2: RGB = [243, 244, 246]
const WHITE: RGB = [255, 255, 255]
const CREAM: RGB = [250, 250, 248]
const RED: RGB = [192, 57, 43]
const RED_50: RGB = [254, 242, 242]
const ORANGE: RGB = [230, 126, 34]
const ORANGE_50: RGB = [255, 247, 237]
const BLUE: RGB = [37, 99, 235]
const BLUE_50: RGB = [239, 246, 255]
const GREEN: RGB = [39, 174, 96]
const GREEN_50: RGB = [236, 253, 245]
const WATERMARK_GRAY: RGB = [240, 240, 240]

// ── Pondération (alignée close-mission edge fn) ────────────────────────────

const CONFORMITY_WEIGHTS: Record<string, number> = { c: 100, lc: 75, pc: 50, nc: 0 }
const conformityWeight = (level: string | null | undefined): number | null => {
  if (level && level in CONFORMITY_WEIGHTS) return CONFORMITY_WEIGHTS[level]
  return null
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function generateAuditReportPDF(data: AuditReportData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ctx = createContext(doc, data)

  const clientLogo = data.client?.logo_url ? await loadImageAsDataURL(data.client.logo_url) : null
  const cabinetLogoLight = data.cabinetLogoUrl ? await loadImageAsDataURL(data.cabinetLogoUrl) : null
  const cabinetLogoDark = data.cabinetLogoDarkUrl ? await loadImageAsDataURL(data.cabinetLogoDarkUrl) : null

  drawCoverPage(ctx, clientLogo, cabinetLogoLight, cabinetLogoDark)
  drawExecutiveLetter(ctx, cabinetLogoLight)
  drawTOC(ctx)
  drawSection01Context(ctx)
  drawSection02Methodology(ctx)
  drawSection03ExecutiveSummary(ctx)
  drawSection04DomainDetails(ctx)
  drawSection05NCFactSheets(ctx)
  drawSection06Recommendations(ctx)
  drawSection07ActionPlan(ctx)
  drawSection08Conclusion(ctx, clientLogo)
  drawAnnexAGlossary(ctx)
  drawAnnexBEvidence(ctx)
  drawAnnexCReferences(ctx)
  drawAnnexDDistribution(ctx)

  // Header/footer + watermark sont dessinés à la fin sur toutes les pages
  // (sauf la couverture) pour bénéficier du nombre total de pages.
  finalizeHeadersFooters(ctx)

  const safeName = (data.client?.name ?? data.mission.name).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
  const year = new Date(data.mission.end_date ?? Date.now()).getFullYear()
  doc.save(`Rapport_audit_${safeName}_${year}_${ctx.reportRef}.pdf`)
}

// ── Context ────────────────────────────────────────────────────────────────

export interface AuditTotals {
  totalControls: number
  assessed: number
  conformes: number; largement: number; partiels: number; nonConformes: number; na: number
  ncMajor: number; ncMinor: number; observations: number
  conformityScore: number
}

export interface DomainStat {
  code: string; name: string; description: string | null
  total: number; scored: number; score: number
  conformes: number; ncMajor: number; ncMinor: number; observations: number
}

interface DocContext {
  doc: jsPDF
  data: AuditReportData & { totals: AuditTotals; domainStats: DomainStat[] }
  pageW: number; pageH: number
  marginL: number; marginR: number
  contentW: number
  y: number
  reportRef: string
  /** map page number → label de section pour le footer dynamique */
  sectionByPage: Map<number, string>
  currentSection: string
  /** Pages où NE PAS afficher header/footer/watermark (couverture). */
  bareCoverPages: Set<number>
  /** Repère les pages de début de section pour le sommaire. */
  tocAnchors: { num: string; title: string; page: number }[]
}

function createContext(doc: jsPDF, data: AuditReportData): DocContext {
  const totals = computeTotals(data.assessments)
  const domainStats = computeDomainStats(data.domains, data.assessments)
  return {
    doc,
    data: { ...data, totals, domainStats },
    pageW: 210, pageH: 297, marginL: 18, marginR: 18,
    contentW: 174, y: 0,
    reportRef: computeReportRef(data.mission.id, data.mission.end_date),
    sectionByPage: new Map(),
    currentSection: 'Couverture',
    bareCoverPages: new Set([1]),
    tocAnchors: [],
  }
}

function computeTotals(assessments: AssessmentWithControl[]): AuditTotals {
  let assessed = 0, c = 0, lc = 0, pc = 0, nc = 0, na = 0, ncMajor = 0, ncMinor = 0, observations = 0
  let scoreSum = 0, scoreCount = 0
  for (const a of assessments) {
    assessed++
    switch (a.conformity_level) {
      case 'c': c++; break; case 'lc': lc++; break; case 'pc': pc++; break
      case 'nc': nc++; break; case 'na': na++; break
    }
    const w = conformityWeight(a.conformity_level)
    if (w !== null) { scoreSum += w; scoreCount++ }
    switch (a.finding_classification) {
      case 'major_nc': ncMajor++; break
      case 'minor_nc': ncMinor++; break
      case 'observation': observations++; break
    }
  }
  return {
    totalControls: assessments.length, assessed,
    conformes: c, largement: lc, partiels: pc, nonConformes: nc, na,
    ncMajor, ncMinor, observations,
    conformityScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
  }
}

function computeDomainStats(domains: DomainWithControls[], assessments: AssessmentWithControl[]): DomainStat[] {
  const byControl = new Map(assessments.map((a) => [a.control_id, a]))
  return domains.map((d) => {
    let scored = 0, sum = 0, conformes = 0, ncMajor = 0, ncMinor = 0, observations = 0
    for (const c of d.controls) {
      const a = byControl.get(c.id)
      if (!a) continue
      const w = conformityWeight(a.conformity_level)
      if (w !== null) { sum += w; scored++ }
      if (a.conformity_level === 'c') conformes++
      if (a.finding_classification === 'major_nc') ncMajor++
      if (a.finding_classification === 'minor_nc') ncMinor++
      if (a.finding_classification === 'observation') observations++
    }
    return {
      code: d.code, name: d.name,
      description: (d as unknown as { description: string | null }).description ?? null,
      total: d.controls.length,
      scored, score: scored > 0 ? Math.round(sum / scored) : 0,
      conformes, ncMajor, ncMinor, observations,
    }
  })
}

function computeReportRef(missionId: string, endDate: string | null | undefined): string {
  const year = endDate ? new Date(endDate).getFullYear() : new Date().getFullYear()
  let h = 0
  for (let i = 0; i < missionId.length; i++) h = ((h << 5) - h + missionId.charCodeAt(i)) | 0
  const seq = Math.abs(h) % 1000
  return `AUD-${year}-${String(seq).padStart(3, '0')}`
}

// ── Pagination ─────────────────────────────────────────────────────────────

function checkPage(ctx: DocContext, needed: number): void {
  if (ctx.y + needed > ctx.pageH - 22) {
    ctx.doc.addPage()
    ctx.y = 22
    ctx.sectionByPage.set(ctx.doc.getCurrentPageInfo().pageNumber, ctx.currentSection)
  }
}

function newSection(ctx: DocContext, num: string, title: string): void {
  ctx.doc.addPage()
  ctx.y = 22
  ctx.currentSection = `${num} ${title}`
  const pn = ctx.doc.getCurrentPageInfo().pageNumber
  ctx.sectionByPage.set(pn, ctx.currentSection)
  ctx.tocAnchors.push({ num, title, page: pn })
}

function setPageContext(ctx: DocContext, label: string): void {
  ctx.currentSection = label
  ctx.sectionByPage.set(ctx.doc.getCurrentPageInfo().pageNumber, label)
}

// ── Header / Footer / Watermark — appliqués à la fin ──────────────────────

function finalizeHeadersFooters(ctx: DocContext): void {
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

function drawPageHeader(ctx: DocContext, pageNum: number, total: number): void {
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

// ── Drawing primitives ─────────────────────────────────────────────────────

function fillRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: RGB): void {
  doc.setFillColor(...color); doc.rect(x, y, w, h, 'F')
}
function fillRounded(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, color: RGB): void {
  doc.setFillColor(...color); doc.roundedRect(x, y, w, h, r, r, 'F')
}
function strokeRounded(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, color: RGB, lw = 0.3): void {
  doc.setDrawColor(...color); doc.setLineWidth(lw); doc.roundedRect(x, y, w, h, r, r, 'S')
}
function setText(doc: jsPDF, color: RGB, size: number, weight: 'normal' | 'bold' = 'normal'): void {
  doc.setFontSize(size); doc.setFont('helvetica', weight); doc.setTextColor(...color)
}

function writeWrapped(ctx: DocContext, text: string, opts: { size?: number; color?: RGB; lineHeight?: number; weight?: 'normal' | 'bold'; indent?: number; bottomGap?: number } = {}): void {
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

function writeParagraphs(ctx: DocContext, paragraphs: string[], opts?: { gap?: number }): void {
  const gap = opts?.gap ?? 3
  for (const p of paragraphs) {
    writeWrapped(ctx, p, { size: 9.8, lineHeight: 5, color: TEXT_700 })
    ctx.y += gap
  }
}

function drawSectionBanner(ctx: DocContext, num: string, title: string, lead: string): void {
  newSection(ctx, num, title)
  const { doc, marginL, contentW } = ctx
  // Bandeau plein
  fillRect(doc, marginL, ctx.y, contentW, 28, FOREST_900)
  // accent or
  fillRect(doc, marginL, ctx.y + 28, contentW, 1.5, GOLD_500)
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

function drawH3(ctx: DocContext, title: string): void {
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

function drawKpi(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, sub: string, color: RGB = FOREST_700): void {
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

// ── Visuels ───────────────────────────────────────────────────────────────

function drawRadarChart(ctx: DocContext, x: number, y: number, size: number, stats: DomainStat[]): void {
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
    let pts: [number, number][] = []
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

function drawPriorityMatrix(ctx: DocContext, x: number, y: number, w: number, h: number, items: AssessmentWithControl[]): void {
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

  // Items dots — heuristique : impact selon classification, effort selon hash
  for (const a of items) {
    let impact = 0.7
    if (a.finding_classification === 'major_nc') impact = 0.9
    else if (a.finding_classification === 'minor_nc') impact = 0.6
    else if (a.finding_classification === 'observation') impact = 0.4
    const recoLen = (a.recommendations ?? '').length
    const effort = Math.min(0.95, Math.max(0.1, recoLen / 600 + 0.2 + ((hashStr(a.id) % 30) / 100)))
    const px = ix + iw * effort
    const py = iy + ih * (1 - impact)
    const color: RGB = a.finding_classification === 'major_nc' ? RED
      : a.finding_classification === 'minor_nc' ? ORANGE : BLUE
    doc.setFillColor(...color); doc.circle(px, py, 1.5, 'F')
  }
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// ── Couverture ─────────────────────────────────────────────────────────────

interface LogoData { dataUrl: string; width: number; height: number; format: 'PNG' | 'JPEG' | 'WEBP' }

function drawCoverPage(ctx: DocContext, clientLogo: LogoData | null, cabinetLogoLight: LogoData | null, cabinetLogoDark: LogoData | null): void {
  const { doc, data, pageW, pageH, marginL } = ctx
  // Hero plein (Deloitte-style : grande zone foncée)
  fillRect(doc, 0, 0, pageW, 175, FOREST_900)
  // accent or épais
  fillRect(doc, 0, 175, pageW, 4, GOLD_500)

  // Logo cabinet (version dark si dispo, sinon light dans cartouche blanc)
  const cabLogo = cabinetLogoDark ?? cabinetLogoLight
  if (cabLogo) {
    const lw = 36, lh = 18
    if (!cabinetLogoDark) fillRounded(doc, marginL - 1, 21, lw + 2, lh + 2, 1.5, WHITE)
    doc.addImage(cabLogo.dataUrl, cabLogo.format, marginL, 22, lw, lh, undefined, 'FAST')
  } else {
    setText(doc, WHITE, 12, 'bold')
    doc.text(data.cabinetName.toUpperCase(), marginL, 30)
  }

  // Référence rapport — coin haut droit
  setText(doc, GOLD_500, 8.5, 'bold')
  doc.text(ctx.reportRef, pageW - marginL, 30, { align: 'right' })
  setText(doc, [200, 220, 210], 7.5, 'normal')
  doc.text('CONFIDENTIEL · Diffusion restreinte', pageW - marginL, 35, { align: 'right' })

  // Eyebrow
  setText(doc, GOLD_500, 9, 'bold')
  doc.text('RAPPORT D’AUDIT', marginL, 88)

  // Titre principal
  setText(doc, WHITE, 30, 'bold')
  const fwName = data.mission.framework_name ?? '—'
  const lines = doc.splitTextToSize(`Audit ${fwName}`, pageW - 2 * marginL) as string[]
  let ty = 102
  for (const l of lines) { doc.text(l, marginL, ty); ty += 11 }

  // Client name
  setText(doc, [220, 230, 225], 16, 'normal')
  doc.text(data.client?.name ?? data.mission.client_name ?? '—', marginL, ty + 4)

  // Bandeau infos clés (sur fond foncé, en bas du hero)
  setText(doc, [200, 220, 210], 8, 'bold')
  doc.text('PÉRIODE D’AUDIT', marginL, 152)
  doc.text('VERSION', marginL + 70, 152)
  doc.text('DATE D’ÉMISSION', marginL + 110, 152)
  setText(doc, WHITE, 10, 'normal')
  doc.text(formatPeriod(data.mission.start_date, data.mission.end_date), marginL, 159)
  doc.text('Définitive — V1.0', marginL + 70, 159)
  doc.text(formatDate(new Date().toISOString()), marginL + 110, 159)

  // Zone basse blanche : équipe + logo client
  // Équipe d'audit
  setText(doc, TEXT_500, 8, 'bold')
  doc.text('ÉQUIPE D’AUDIT', marginL, 195)
  setText(doc, FOREST_900, 11, 'bold')
  const lead = ctx.data.members.find((m) => m.role === 'lead_auditor')
  const associate = ctx.data.members.find((m) => m.role === 'associate')
  const auditors = ctx.data.members.filter((m) => m.role !== 'lead_auditor' && m.role !== 'associate')
  let ey = 202
  if (associate) { doc.text(`${memberName(associate)}`, marginL, ey); setText(doc, TEXT_500, 8.5, 'normal'); doc.text('Associé signataire', marginL, ey + 4); setText(doc, FOREST_900, 11, 'bold'); ey += 10 }
  if (lead)      { doc.text(`${memberName(lead)}`, marginL, ey);      setText(doc, TEXT_500, 8.5, 'normal'); doc.text('Chef de mission', marginL, ey + 4);     setText(doc, FOREST_900, 11, 'bold'); ey += 10 }
  setText(doc, TEXT_700, 9, 'normal')
  if (auditors.length > 0) {
    doc.text(`${auditors.length} auditeur${auditors.length > 1 ? 's' : ''} de mission`, marginL, ey)
  }

  // Logo client en bas droite
  if (clientLogo) {
    const maxW = 44, maxH = 26
    const ratio = clientLogo.width / clientLogo.height
    let lw = maxW, lh = maxW / ratio
    if (lh > maxH) { lh = maxH; lw = maxH * ratio }
    const lx = pageW - marginL - lw - 4
    const ly = 195
    fillRounded(doc, lx - 1, ly - 1, lw + 4, lh + 4, 1.5, WHITE)
    strokeRounded(doc, lx - 1, ly - 1, lw + 4, lh + 4, 1.5, BORDER, 0.3)
    doc.addImage(clientLogo.dataUrl, clientLogo.format, lx + 1, ly + 1, lw, lh, undefined, 'FAST')
  }

  // Pied couverture
  doc.setDrawColor(...GOLD_500); doc.setLineWidth(0.6)
  doc.line(marginL, pageH - 38, pageW - marginL, pageH - 38)
  setText(doc, TEXT_500, 7, 'bold')
  doc.text('CABINET D’AUDIT', marginL, pageH - 33)
  doc.text('CONTACT', marginL + 70, pageH - 33)
  doc.text('CLASSIFICATION', pageW - marginL, pageH - 33, { align: 'right' })
  setText(doc, FOREST_900, 9, 'bold')
  doc.text(data.cabinetName, marginL, pageH - 28)
  setText(doc, TEXT_700, 8.5, 'normal')
  if (data.cabinetAddress) {
    const addrLines = data.cabinetAddress.split('\n')
    let ay = pageH - 23
    for (const l of addrLines) { doc.text(l, marginL, ay); ay += 4 }
  }
  if (data.cabinetWebsite) doc.text(data.cabinetWebsite, marginL + 70, pageH - 28)
  if (data.cabinetPhone)   doc.text(data.cabinetPhone, marginL + 70, pageH - 23)
  if (data.cabinetSupportEmail) doc.text(data.cabinetSupportEmail, marginL + 70, pageH - 18)
  setText(doc, RED, 9, 'bold')
  doc.text('CONFIDENTIEL', pageW - marginL, pageH - 28, { align: 'right' })
  setText(doc, TEXT_500, 7.5, 'normal')
  doc.text('Diffusion restreinte (cf. Annexe D)', pageW - marginL, pageH - 23, { align: 'right' })
}

// ── Lettre executive (1 page, signée Associé) ─────────────────────────────

function drawExecutiveLetter(ctx: DocContext, cabinetLogoLight: LogoData | null): void {
  ctx.doc.addPage()
  ctx.y = 22
  ctx.currentSection = 'Lettre de mission'
  ctx.sectionByPage.set(ctx.doc.getCurrentPageInfo().pageNumber, ctx.currentSection)
  ctx.tocAnchors.push({ num: '', title: 'Lettre au comité d’audit', page: ctx.doc.getCurrentPageInfo().pageNumber })

  const { doc, marginL, contentW, pageW } = ctx

  // Header cabinet
  if (cabinetLogoLight) {
    doc.addImage(cabinetLogoLight.dataUrl, cabinetLogoLight.format, marginL, ctx.y, 32, 16, undefined, 'FAST')
  } else {
    setText(doc, FOREST_900, 13, 'bold')
    doc.text(ctx.data.cabinetName, marginL, ctx.y + 8)
  }
  setText(doc, TEXT_500, 7.5, 'normal')
  let cy = ctx.y + 4
  doc.text(ctx.data.cabinetName, pageW - marginL, cy, { align: 'right' }); cy += 4
  if (ctx.data.cabinetAddress) {
    for (const l of ctx.data.cabinetAddress.split('\n')) { doc.text(l, pageW - marginL, cy, { align: 'right' }); cy += 4 }
  }
  if (ctx.data.cabinetPhone)   { doc.text(ctx.data.cabinetPhone, pageW - marginL, cy, { align: 'right' }); cy += 4 }
  if (ctx.data.cabinetWebsite) { doc.text(ctx.data.cabinetWebsite, pageW - marginL, cy, { align: 'right' }); cy += 4 }
  ctx.y += 24

  // Filet doré
  doc.setDrawColor(...GOLD_500); doc.setLineWidth(0.7)
  doc.line(marginL, ctx.y, pageW - marginL, ctx.y)
  ctx.y += 8

  // Date + destinataire
  setText(doc, TEXT_700, 9.5, 'normal')
  doc.text(`Le ${formatDate(new Date().toISOString())}`, pageW - marginL, ctx.y, { align: 'right' })
  ctx.y += 10
  setText(doc, FOREST_900, 10.5, 'bold')
  doc.text(`Direction de ${ctx.data.client?.name ?? ctx.data.mission.client_name ?? '—'}`, marginL, ctx.y); ctx.y += 5
  setText(doc, TEXT_500, 8.5, 'normal')
  doc.text('Comité d’audit & instances de gouvernance', marginL, ctx.y); ctx.y += 8

  // Objet
  setText(doc, TEXT_900, 10, 'bold')
  doc.text('Objet :', marginL, ctx.y)
  setText(doc, TEXT_700, 10, 'normal')
  doc.text(`Rapport d’audit ${ctx.data.mission.framework_name ?? ''} — Réf. ${ctx.reportRef}`, marginL + 14, ctx.y)
  ctx.y += 8

  // Corps
  const body = generateExecutiveLetterBody(ctx.data)
  for (let i = 0; i < body.length; i++) {
    const w = i === 0 ? 'bold' : 'normal'
    writeWrapped(ctx, body[i], { size: 10, lineHeight: 5.2, weight: w })
    ctx.y += 3.5
  }

  // Bloc signature Associé en bas droite
  const sigY = ctx.pageH - 60
  ctx.y = Math.max(ctx.y, sigY - 4)
  setText(doc, TEXT_500, 8, 'bold')
  doc.text('Signature de l’Associé signataire', pageW - marginL, sigY, { align: 'right' })
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.4)
  doc.line(pageW - marginL - 60, sigY + 18, pageW - marginL, sigY + 18)
  const associate = ctx.data.members.find((m) => m.role === 'associate')
  setText(doc, FOREST_900, 10.5, 'bold')
  doc.text(associate ? memberName(associate) : '—', pageW - marginL, sigY + 24, { align: 'right' })
  setText(doc, TEXT_500, 8, 'normal')
  doc.text('Associé signataire', pageW - marginL, sigY + 28, { align: 'right' })
  doc.text(ctx.data.cabinetName, pageW - marginL, sigY + 32, { align: 'right' })
}

// ── Sommaire ──────────────────────────────────────────────────────────────

function drawTOC(ctx: DocContext): void {
  ctx.doc.addPage()
  ctx.y = 22
  setPageContext(ctx, 'Sommaire')

  const { doc, marginL, contentW } = ctx
  setText(doc, FOREST_900, 22, 'bold')
  doc.text('Sommaire', marginL, ctx.y); ctx.y += 4
  doc.setDrawColor(...GOLD_500); doc.setLineWidth(0.8)
  doc.line(marginL, ctx.y, marginL + 30, ctx.y); ctx.y += 14

  // Lignes pré-renseignées (anchors construits au fil des sections par drawSectionBanner)
  // Comme on ne connaît pas encore les pages des sections suivantes, on garde un placeholder
  // que finalizeHeadersFooters vient remplir. On dessine juste un cadre stylisé.
  const items: { label: string; anchorKey: string }[] = [
    { label: 'Lettre au comité d’audit', anchorKey: 'letter' },
    { label: '01 — Contexte et mandat', anchorKey: '01' },
    { label: '02 — Méthodologie d’audit', anchorKey: '02' },
    { label: '03 — Synthèse exécutive', anchorKey: '03' },
    { label: '04 — Détail par domaine', anchorKey: '04' },
    { label: '05 — Fiches de non-conformités majeures', anchorKey: '05' },
    { label: '06 — Recommandations et matrice de priorisation', anchorKey: '06' },
    { label: '07 — Plan d’action de remédiation', anchorKey: '07' },
    { label: '08 — Conclusion et opinion d’audit', anchorKey: '08' },
    { label: 'Annexe A — Glossaire', anchorKey: 'A' },
    { label: 'Annexe B — Preuves examinées', anchorKey: 'B' },
    { label: 'Annexe C — Références normatives', anchorKey: 'C' },
    { label: 'Annexe D — Liste de diffusion', anchorKey: 'D' },
  ]

  for (const item of items) {
    setText(doc, TEXT_900, 11, 'bold')
    doc.text(item.label, marginL, ctx.y)
    setText(doc, TEXT_400, 10, 'normal')
    // Pointillés
    const labelW = doc.getTextWidth(item.label)
    let dotsX = marginL + labelW + 3
    while (dotsX < marginL + contentW - 14) { doc.text('.', dotsX, ctx.y); dotsX += 1.6 }
    // Page : on inscrit '—' ; finalizeHeadersFooters réécrit le numéro réel.
    doc.text('—', marginL + contentW, ctx.y, { align: 'right' })
    ctx.y += 7
  }

  // Watermark + pagination viendront en finalize.
  // On stocke les ancres TOC dans ctx pour les remplir plus tard.
  ctx.tocAnchors = ctx.tocAnchors // (placeholder, rempli au fil)
}

// ── Section 01 — Contexte ─────────────────────────────────────────────────

function drawSection01Context(ctx: DocContext): void {
  drawSectionBanner(ctx, '01', 'Contexte et mandat', 'Cadre de la mission, périmètre, équipe et destinataires du rapport')
  writeParagraphs(ctx, generateContextNarrative(ctx.data), { gap: 4 })
}

// ── Section 02 — Méthodologie ─────────────────────────────────────────────

function drawSection02Methodology(ctx: DocContext): void {
  drawSectionBanner(ctx, '02', 'Méthodologie d’audit', "Standards mobilisés, techniques d'audit, échantillonnage et matérialité")
  writeParagraphs(ctx, generateMethodologyNarrative(ctx.data), { gap: 4 })
}

// ── Section 03 — Synthèse exécutive ───────────────────────────────────────

function drawSection03ExecutiveSummary(ctx: DocContext): void {
  drawSectionBanner(ctx, '03', 'Synthèse exécutive', "Score de conformité, verdict, lecture rapide, radar de maturité")

  const { doc, marginL, contentW, data } = ctx
  const t = data.totals
  const v = describeVerdict(t.conformityScore, t.ncMajor)

  // Bloc score / verdict (Deloitte-style : grand chiffre + bandeau)
  const blockH = 46
  fillRounded(doc, marginL, ctx.y, contentW, blockH, 3, FOREST_900)
  fillRect(doc, marginL, ctx.y, 4, blockH, GOLD_500)
  setText(doc, [200, 220, 210], 8, 'bold')
  doc.text('SCORE DE CONFORMITÉ PONDÉRÉ', marginL + 10, ctx.y + 9)
  setText(doc, GOLD_500, 42, 'bold')
  doc.text(`${t.conformityScore}%`, marginL + 10, ctx.y + 32)
  setText(doc, [200, 220, 210], 7.5, 'normal')
  doc.text('c=100 / lc=75 / pc=50 / nc=0  ·  NA exclus', marginL + 10, ctx.y + 39)
  // Verdict box à droite
  const vx = marginL + contentW - 78
  fillRounded(doc, vx, ctx.y + 7, 72, blockH - 14, 2, WHITE)
  setText(doc, TEXT_500, 7.5, 'bold')
  doc.text('OPINION D’AUDIT', vx + 4, ctx.y + 14)
  const vColor = v.label === 'Favorable' ? GREEN : v.label === 'Favorable avec réserves' ? GOLD_500 : v.label === 'Réservée' ? ORANGE : RED
  setText(doc, vColor, 13, 'bold')
  doc.text(v.label, vx + 4, ctx.y + 22)
  setText(doc, TEXT_700, 7.8, 'normal')
  const ll = doc.splitTextToSize(v.toneOpening, 64) as string[]
  let yy = ctx.y + 27
  for (const l of ll.slice(0, 3)) { doc.text(l, vx + 4, yy); yy += 3.8 }
  ctx.y += blockH + 10

  // KPI row
  const kpiH = 24, gap = 4, kpiW = (contentW - gap * 3) / 4
  drawKpi(doc, marginL + 0 * (kpiW + gap), ctx.y, kpiW, kpiH, 'Contrôles', `${t.totalControls}`, 'évalués', FOREST_700)
  drawKpi(doc, marginL + 1 * (kpiW + gap), ctx.y, kpiW, kpiH, 'Conformes', `${t.conformes}`, 'level c', GREEN)
  drawKpi(doc, marginL + 2 * (kpiW + gap), ctx.y, kpiW, kpiH, 'NC majeures', `${t.ncMajor}`, 'à traiter', RED)
  drawKpi(doc, marginL + 3 * (kpiW + gap), ctx.y, kpiW, kpiH, 'NC mineures', `${t.ncMinor}`, 'à corriger', ORANGE)
  ctx.y += kpiH + 10

  // Narratif
  drawH3(ctx, 'Lecture rapide')
  writeParagraphs(ctx, generateExecutiveNarrative(ctx.data), { gap: 4 })

  // Radar de maturité
  checkPage(ctx, 90)
  drawH3(ctx, 'Radar de maturité par domaine')
  writeWrapped(ctx, 'Le radar ci-dessous projette le score pondéré de chaque domaine sur un axe gradué de 0 à 100. La forme du polygone donne une lecture immédiate des forces et des faiblesses du dispositif d’ensemble.', { size: 9.5, color: TEXT_700 })
  ctx.y += 2
  drawRadarChart(ctx, marginL + (contentW - 100) / 2, ctx.y, 100, ctx.data.domainStats)
  ctx.y += 100
}

// ── Section 04 — Détail par domaine ───────────────────────────────────────

function drawSection04DomainDetails(ctx: DocContext): void {
  drawSectionBanner(ctx, '04', 'Détail par domaine', 'Score, maturité, faits saillants et statistiques de couverture')
  for (const d of ctx.data.domainStats) {
    drawDomainBlock(ctx, d)
  }
}

function drawDomainBlock(ctx: DocContext, d: DomainStat): void {
  checkPage(ctx, 70)
  const { doc, marginL, contentW } = ctx
  // En-tête domaine
  fillRounded(doc, marginL, ctx.y, contentW, 16, 2, FOREST_50)
  fillRect(doc, marginL, ctx.y, 4, 16, GOLD_500)
  setText(doc, FOREST_900, 12, 'bold')
  doc.text(`${d.code} — ${d.name}`, marginL + 8, ctx.y + 10)
  // Score badge
  const sx = marginL + contentW - 26
  const sc = d.score >= 80 ? GREEN : d.score >= 60 ? GOLD_500 : RED
  fillRounded(doc, sx, ctx.y + 3, 22, 10, 2, sc)
  setText(doc, WHITE, 10, 'bold')
  doc.text(`${d.score}%`, sx + 11, ctx.y + 10, { align: 'center' })
  ctx.y += 18

  // Stats inline
  setText(doc, TEXT_500, 8.5, 'normal')
  doc.text(`${d.scored}/${d.total} contrôles évalués · ${d.conformes} strictement conformes · ${d.ncMajor} NC maj · ${d.ncMinor} NC min · ${d.observations} obs.`, marginL, ctx.y)
  ctx.y += 6

  // Narratif
  writeWrapped(ctx, generateDomainNarrative(d, ctx.data), { size: 9.5, lineHeight: 5 })

  // Description du domaine si dispo
  if (d.description?.trim()) {
    writeWrapped(ctx, `Périmètre couvert : ${d.description.trim()}`, { size: 9, color: TEXT_500, lineHeight: 4.6, weight: 'normal' })
  }
  ctx.y += 5
}

// ── Section 05 — Fiches NC majeures ───────────────────────────────────────

function drawSection05NCFactSheets(ctx: DocContext): void {
  drawSectionBanner(ctx, '05', 'Fiches de non-conformités majeures', 'Une fiche normalisée par NC majeure : exigence, constat, preuves, cause racine, impact, recommandation')

  const majors = ctx.data.assessments.filter((a) => a.finding_classification === 'major_nc')
  if (majors.length === 0) {
    writeParagraphs(ctx, [
      `Au terme de l'audit, aucune non-conformité majeure n'a été caractérisée. L'organisation présente, sur l'intégralité du périmètre couvert, un dispositif de contrôle interne dont les éventuels écarts résiduels relèvent de non-conformités mineures ou d'observations dont le détail figure en section 4.`,
    ], { gap: 4 })
    return
  }

  let i = 1
  for (const a of majors) {
    drawNCFactSheet(ctx, a, i, majors.length)
    i++
  }
}

function drawNCFactSheet(ctx: DocContext, a: AssessmentWithControl, idx: number, total: number): void {
  // 1 fiche = 1 page idéalement
  ctx.doc.addPage()
  ctx.y = 22
  setPageContext(ctx, `05 Fiches NC majeures (${idx}/${total})`)

  const { doc, marginL, contentW, pageW } = ctx
  // Bandeau fiche
  fillRect(doc, marginL, ctx.y, contentW, 18, RED)
  setText(doc, WHITE, 8.5, 'bold')
  doc.text(`FICHE NC MAJEURE  ·  ${idx}/${total}`, marginL + 6, ctx.y + 7)
  setText(doc, WHITE, 13, 'bold')
  doc.text(`${a.control.code} — ${truncate(a.control.name, 60)}`, marginL + 6, ctx.y + 14)
  ctx.y += 22

  const sheet = generateNCFactSheet(a, ctx.data)
  drawNCBlock(ctx, 'Exigence du référentiel', sheet.requirement, FOREST_700)
  drawNCBlock(ctx, 'Constat d’audit', sheet.observation, RED)
  drawNCBlock(ctx, 'Éléments de preuve examinés', sheet.evidence, BLUE)
  drawNCBlock(ctx, 'Cause racine présumée', sheet.rootCause, ORANGE)
  drawNCBlock(ctx, 'Impact', sheet.impact, RED)
  drawNCBlock(ctx, 'Recommandation', sheet.recommendation, GREEN)
  drawNCBlock(ctx, 'Justification de la classification', sheet.severityRationale, TEXT_700)

  // Méta-données pied de fiche
  checkPage(ctx, 14)
  fillRounded(doc, marginL, ctx.y, contentW, 10, 2, CREAM)
  setText(doc, TEXT_500, 7.5, 'bold')
  doc.text('CLASSIFICATION', marginL + 4, ctx.y + 6)
  doc.text('STATUT', marginL + 60, ctx.y + 6)
  doc.text('CAR ASSOCIÉE', marginL + 110, ctx.y + 6)
  setText(doc, FOREST_900, 9, 'bold')
  doc.text('NC majeure (P1)', marginL + 28, ctx.y + 6)
  doc.text(statusLabel(a.status), marginL + 75, ctx.y + 6)
  doc.text('Suivi sur la plateforme', marginL + 132, ctx.y + 6)
  ctx.y += 12
}

function drawNCBlock(ctx: DocContext, title: string, body: string, accent: RGB): void {
  const { doc, marginL, contentW } = ctx
  const bodyLines = doc.splitTextToSize(body, contentW - 8) as string[]
  const blockH = 8 + bodyLines.length * 4.6 + 4
  checkPage(ctx, blockH + 4)
  // Filet accent
  fillRect(doc, marginL, ctx.y, 2.5, blockH, accent)
  // Titre
  setText(doc, accent, 8, 'bold')
  doc.text(title.toUpperCase(), marginL + 6, ctx.y + 5)
  // Corps
  setText(doc, TEXT_700, 9.5, 'normal')
  let by = ctx.y + 11
  for (const l of bodyLines) { doc.text(l, marginL + 6, by); by += 4.6 }
  ctx.y += blockH + 3
}

function statusLabel(s: string): string {
  switch (s) {
    case 'draft': return 'Brouillon'
    case 'submitted': return 'Soumis'
    case 'in_review': return 'En revue'
    case 'approved': return 'Validé'
    case 'rejected': return 'Rejeté'
    default: return s
  }
}

// ── Section 06 — Recommandations + matrice ────────────────────────────────

function drawSection06Recommendations(ctx: DocContext): void {
  drawSectionBanner(ctx, '06', 'Recommandations et matrice de priorisation', "Hiérarchisation des recommandations selon l'axe impact × effort")

  writeParagraphs(ctx, generateRecommendationNarrative(ctx.data), { gap: 4 })

  // Matrice
  const items = ctx.data.assessments.filter((a) => a.finding_classification === 'major_nc' || a.finding_classification === 'minor_nc' || a.finding_classification === 'observation')
  if (items.length === 0) {
    writeWrapped(ctx, 'Aucune recommandation à hiérarchiser à ce stade.', { color: TEXT_500 })
    return
  }
  checkPage(ctx, 110)
  drawH3(ctx, 'Matrice impact × effort')
  drawPriorityMatrix(ctx, ctx.marginL, ctx.y, ctx.contentW, 90, items)
  ctx.y += 94

  // Top 10 recos
  const order = (a: AssessmentWithControl): number => a.finding_classification === 'major_nc' ? 0 : a.finding_classification === 'minor_nc' ? 1 : 2
  const top = items
    .filter((a) => (a.recommendations ?? '').trim().length > 0)
    .sort((a, b) => order(a) - order(b))
    .slice(0, 10)

  if (top.length > 0) {
    drawH3(ctx, 'Top 10 recommandations')
    let i = 1
    for (const a of top) {
      drawRecoCard(ctx, a, i)
      i++
    }
  }
}

function drawRecoCard(ctx: DocContext, a: AssessmentWithControl, idx: number): void {
  const { doc, marginL, contentW } = ctx
  const priority = a.finding_classification === 'major_nc' ? 'P1' : a.finding_classification === 'minor_nc' ? 'P2' : 'P3'
  const color = priority === 'P1' ? RED : priority === 'P2' ? ORANGE : BLUE

  const text = a.recommendations ?? '—'
  const lines = doc.splitTextToSize(text, contentW - 24) as string[]
  const cardH = 14 + lines.length * 4.5 + 2
  checkPage(ctx, cardH + 3)

  fillRounded(doc, marginL, ctx.y, contentW, cardH, 2, WHITE)
  strokeRounded(doc, marginL, ctx.y, contentW, cardH, 2, BORDER, 0.4)

  fillRounded(doc, marginL + 4, ctx.y + 3, 10, 10, 2, FOREST_700)
  setText(doc, WHITE, 9, 'bold')
  doc.text(`${idx}`, marginL + 9, ctx.y + 9.7, { align: 'center' })

  fillRounded(doc, marginL + 16, ctx.y + 4, 11, 5, 1.2, color)
  setText(doc, WHITE, 7, 'bold')
  doc.text(priority, marginL + 21.5, ctx.y + 7.5, { align: 'center' })

  setText(doc, FOREST_900, 9, 'bold')
  doc.text(`${a.control.code} — ${truncate(a.control.name, 55)}`, marginL + 32, ctx.y + 8)

  setText(doc, TEXT_700, 9, 'normal')
  let ly = ctx.y + 14
  for (const l of lines) { doc.text(l, marginL + 8, ly); ly += 4.5 }

  ctx.y += cardH + 2
}

// ── Section 07 — Plan d'action ────────────────────────────────────────────

function drawSection07ActionPlan(ctx: DocContext): void {
  drawSectionBanner(ctx, '07', 'Plan d’action de remédiation', "Cycle de vie des CAR, suivi sur la plateforme et tableau récapitulatif")
  writeParagraphs(ctx, generateActionPlanNarrative(ctx.data), { gap: 4 })

  const items = ctx.data.assessments.filter((a) => a.finding_classification === 'major_nc' || a.finding_classification === 'minor_nc' || a.finding_classification === 'observation')
  if (items.length === 0) {
    writeWrapped(ctx, 'Aucune action à inscrire au plan : la mission ne présente pas de non-conformité ni d’observation.', { color: TEXT_500 })
    return
  }
  drawH3(ctx, `Récapitulatif (${items.length} CAR)`)
  drawTable(ctx,
    ['Réf.', 'Domaine', 'Type', 'Description (extrait)'],
    items.slice(0, 40).map((a) => {
      const dom = ctx.data.domainStats.find((d) => ctx.data.domains.find((dd) => dd.code === d.code)?.controls.some((c) => c.id === a.control_id))
      return [
        a.control.code, dom?.code ?? '—',
        a.finding_classification === 'major_nc' ? 'NC maj' : a.finding_classification === 'minor_nc' ? 'NC min' : 'Obs.',
        truncate(a.findings ?? '—', 80),
      ]
    }),
    [22, 22, 18, 112],
  )
  if (items.length > 40) {
    writeWrapped(ctx, `(${items.length - 40} actions supplémentaires accessibles via l'export Excel du plan d'action.)`, { color: TEXT_500, size: 8.5 })
  }
}

// ── Section 08 — Conclusion + signataires ─────────────────────────────────

function drawSection08Conclusion(ctx: DocContext, _clientLogo: LogoData | null): void {
  drawSectionBanner(ctx, '08', 'Conclusion et opinion d’audit', 'Verdict argumenté, conditions de délivrance et signatures')

  writeParagraphs(ctx, generateConclusionNarrative(ctx.data), { gap: 4 })

  // Encadré verdict
  const v = describeVerdict(ctx.data.totals.conformityScore, ctx.data.totals.ncMajor)
  checkPage(ctx, 28)
  const { doc, marginL, contentW } = ctx
  fillRounded(doc, marginL, ctx.y, contentW, 22, 2.4, FOREST_900)
  fillRect(doc, marginL, ctx.y, 4, 22, GOLD_500)
  setText(doc, [200, 220, 210], 8, 'bold')
  doc.text('OPINION D’AUDIT FORMELLE', marginL + 10, ctx.y + 8)
  setText(doc, GOLD_500, 16, 'bold')
  doc.text(v.label, marginL + 10, ctx.y + 17)
  ctx.y += 28

  // Signatures
  drawH3(ctx, 'Signatures')
  const lead = ctx.data.members.find((m) => m.role === 'lead_auditor')
  const associate = ctx.data.members.find((m) => m.role === 'associate')
  const cardW = (contentW - 8) / 3, cardH = 38
  drawSignatureCard(doc, marginL + 0 * (cardW + 4), ctx.y, cardW, cardH, 'Associé signataire', associate ? memberName(associate) : '—', ctx.data.cabinetName)
  drawSignatureCard(doc, marginL + 1 * (cardW + 4), ctx.y, cardW, cardH, 'Chef de mission', lead ? memberName(lead) : '—', ctx.data.cabinetName)
  drawSignatureCard(doc, marginL + 2 * (cardW + 4), ctx.y, cardW, cardH, 'Pour l’entité auditée', '—', ctx.data.client?.name ?? ctx.data.mission.client_name ?? '—')
  ctx.y += cardH + 4
}

function drawSignatureCard(doc: jsPDF, x: number, y: number, w: number, h: number, role: string, name: string, fn: string): void {
  fillRounded(doc, x, y, w, h, 2, WHITE)
  strokeRounded(doc, x, y, w, h, 2, BORDER, 0.4)
  setText(doc, TEXT_500, 7.5, 'bold')
  doc.text(role.toUpperCase(), x + 4, y + 6)
  fillRect(doc, x + 4, y + 9, w - 8, 18, [248, 250, 252])
  strokeRounded(doc, x + 4, y + 9, w - 8, 18, 1, BORDER, 0.2)
  setText(doc, TEXT_900, 9, 'bold')
  doc.text(name, x + 4, y + h - 7)
  setText(doc, TEXT_500, 7.5, 'normal')
  doc.text(fn, x + 4, y + h - 3)
}

// ── Annexes ───────────────────────────────────────────────────────────────

function drawAnnexAGlossary(ctx: DocContext): void {
  drawSectionBanner(ctx, 'A', 'Glossaire', 'Définitions des termes techniques utilisés dans le rapport')
  for (const g of generateGlossary()) {
    checkPage(ctx, 12)
    setText(ctx.doc, FOREST_900, 9.5, 'bold')
    ctx.doc.text(g.term, ctx.marginL, ctx.y)
    setText(ctx.doc, TEXT_700, 9.2, 'normal')
    const lines = ctx.doc.splitTextToSize(g.def, ctx.contentW - 30) as string[]
    ctx.doc.text(lines[0] ?? '', ctx.marginL + 30, ctx.y)
    ctx.y += 4.6
    for (let i = 1; i < lines.length; i++) {
      checkPage(ctx, 5)
      ctx.doc.text(lines[i], ctx.marginL + 30, ctx.y); ctx.y += 4.6
    }
    ctx.y += 2
  }
}

function drawAnnexBEvidence(ctx: DocContext): void {
  drawSectionBanner(ctx, 'B', 'Preuves examinées', "Liste des éléments documentaires versés au dossier de mission")
  if (ctx.data.evidenceDocs.length === 0) {
    writeWrapped(ctx, 'Aucun document n’a été versé au dossier de mission via la plateforme. Les preuves examinées au cours de l’audit ont fait l’objet de constats et d’extraits archivés dans les workpapers internes.', { color: TEXT_500 })
    return
  }
  writeWrapped(ctx, `Le tableau ci-dessous liste les ${ctx.data.evidenceDocs.length} document(s) versé(s) au dossier de la mission. Il s’agit des preuves examinées formellement par l’équipe d’audit en complément des entretiens, observations et tests substantifs conduits sur site.`, { size: 9.5, lineHeight: 4.8 })
  ctx.y += 3
  drawTable(ctx,
    ['Date', 'Type', 'Nom du fichier'],
    ctx.data.evidenceDocs.map((d) => [
      formatDate(d.created_at),
      d.document_type ?? '—',
      truncate(d.file_name, 80),
    ]),
    [28, 32, 114],
  )
}

function drawAnnexCReferences(ctx: DocContext): void {
  drawSectionBanner(ctx, 'C', 'Références normatives', 'Standards, normes et bonnes pratiques mobilisés au cours de l’audit')
  const fw = ctx.data.mission.framework_name ?? ''
  const refs: { ref: string; title: string }[] = [
    { ref: fw || 'Référentiel d’audit', title: 'Cadre de référence principal de la mission' },
    { ref: 'ISO 19011:2018', title: 'Lignes directrices pour l’audit des systèmes de management' },
    { ref: 'ISO/IEC 17021-1:2015', title: 'Évaluation de la conformité — Exigences pour les organismes procédant à l’audit et à la certification des systèmes de management' },
    { ref: 'COSO Internal Control Framework (2013)', title: 'Cadre intégré de contrôle interne — Committee of Sponsoring Organizations of the Treadway Commission' },
    { ref: 'IIA — IPPF', title: 'International Professional Practices Framework — Institute of Internal Auditors' },
  ]
  for (const r of refs) {
    checkPage(ctx, 10)
    setText(ctx.doc, FOREST_900, 9.5, 'bold')
    ctx.doc.text(r.ref, ctx.marginL, ctx.y)
    setText(ctx.doc, TEXT_700, 9, 'normal')
    const lines = ctx.doc.splitTextToSize(r.title, ctx.contentW - 70) as string[]
    ctx.doc.text(lines[0] ?? '', ctx.marginL + 70, ctx.y)
    ctx.y += 5
    for (let i = 1; i < lines.length; i++) { ctx.doc.text(lines[i], ctx.marginL + 70, ctx.y); ctx.y += 5 }
    ctx.y += 2
  }
}

function drawAnnexDDistribution(ctx: DocContext): void {
  drawSectionBanner(ctx, 'D', 'Liste de diffusion', 'Destinataires autorisés du présent rapport — confidentialité')

  writeWrapped(ctx, 'Le présent rapport est confidentiel et sa diffusion est strictement restreinte aux personnes listées ci-dessous. Toute communication, reproduction ou exploitation en dehors de ce périmètre nécessite l’accord préalable et écrit du cabinet.', { size: 9.5, lineHeight: 4.8 })
  ctx.y += 4

  drawH3(ctx, 'Côté cabinet')
  for (const m of ctx.data.members) {
    const u = (m as unknown as { user?: { first_name?: string; last_name?: string; email?: string; job_title?: string } }).user
    if (!u) continue
    const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
    const role = ROLE_LABELS[m.role] ?? m.role
    const job = u.job_title ?? ''
    drawDistributionRow(ctx, name, role + (job ? ` · ${job}` : ''), u.email ?? '')
  }

  ctx.y += 4
  drawH3(ctx, 'Côté entité auditée')
  if (ctx.data.clientContacts.length === 0) {
    writeWrapped(ctx, 'Aucun contact client n’a été déclaré sur la plateforme.', { color: TEXT_500 })
  } else {
    for (const c of ctx.data.clientContacts) {
      drawDistributionRow(ctx, c.contact_name, c.job_title ?? 'Contact', c.email)
    }
  }
}

function drawDistributionRow(ctx: DocContext, name: string, role: string, email: string): void {
  checkPage(ctx, 8)
  const { doc, marginL, contentW } = ctx
  setText(doc, FOREST_900, 9.5, 'bold')
  doc.text(name, marginL, ctx.y)
  setText(doc, TEXT_500, 8.5, 'normal')
  doc.text(role, marginL + 56, ctx.y)
  setText(doc, TEXT_700, 8.5, 'normal')
  doc.text(email, marginL + contentW, ctx.y, { align: 'right' })
  ctx.y += 5
}

// ── Generic table ──────────────────────────────────────────────────────────

function drawTable(ctx: DocContext, headers: string[], rows: string[][], widths: number[]): void {
  const { doc, marginL } = ctx
  const headerH = 8, rowH = 6
  const totalW = widths.reduce((s, w) => s + w, 0)

  checkPage(ctx, headerH + rowH * Math.min(rows.length, 3))
  fillRect(doc, marginL, ctx.y, totalW, headerH, FOREST_900)
  setText(doc, WHITE, 8, 'bold')
  let cx = marginL
  for (let i = 0; i < headers.length; i++) { doc.text(headers[i], cx + 2, ctx.y + 5.4); cx += widths[i] }
  ctx.y += headerH

  setText(doc, TEXT_700, 8, 'normal')
  let zebra = false
  for (const row of rows) {
    checkPage(ctx, rowH)
    if (zebra) fillRect(doc, marginL, ctx.y, totalW, rowH, CREAM)
    cx = marginL
    for (let i = 0; i < row.length; i++) { doc.text(row[i], cx + 2, ctx.y + 4); cx += widths[i] }
    ctx.y += rowH
    zebra = !zebra
  }
  ctx.y += 3
}

// ── Helpers ────────────────────────────────────────────────────────────────

function memberName(m: MissionMemberRow): string {
  const u = (m as unknown as { user?: { first_name?: string; last_name?: string } }).user
  return u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || '—' : '—'
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return '—'
  return `${formatDate(start)} → ${formatDate(end)}`
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

async function loadImageAsDataURL(url: string): Promise<LogoData | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    const mime = blob.type.toLowerCase()
    let format: LogoData['format'] | null = null
    if (mime.includes('png')) format = 'PNG'
    else if (mime.includes('jpeg') || mime.includes('jpg')) format = 'JPEG'
    else if (mime.includes('webp')) format = 'WEBP'
    if (!format) return null
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => reject(new Error('FileReader error'))
      r.readAsDataURL(blob)
    })
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('Image decode error'))
      img.src = dataUrl
    })
    return { dataUrl, format, width: dims.width, height: dims.height }
  } catch (err) {
    console.warn('[audit-pdf] logo load failed:', err)
    return null
  }
}
