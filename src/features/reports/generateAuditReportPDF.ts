import jsPDF from 'jspdf'
import type { MissionDetail, MissionMemberRow } from '../missions/useMissionDetail'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'
import type { CabinetClient, ControlAssessment } from '../../types/database.types'
import { ROLE_LABELS } from '../missions/mission-constants'

/**
 * Générateur PDF du Rapport d'audit complet.
 * Calqué sur generateScopingNotePDF.ts : mêmes primitives, même charte
 * graphique. Sections 1 à 8 : couverture, synthèse exécutive, périmètre,
 * score par domaine, constats, recommandations, plan d'action, conclusion
 * + signataires.
 *
 * Toutes les données sortent de l'existant :
 *   - mission (status, dates, conclusion)
 *   - assessments (conformity_level, findings, recommendations, classification)
 *   - domains (cadre du framework)
 *   - members (équipe d'audit)
 *   - client (logo + nom + RSSI éventuel)
 */

// ── Types externes ─────────────────────────────────────────────────────────

export interface AssessmentWithControl extends ControlAssessment {
  control: { id: string; code: string; name: string; domain_id: string }
}

export interface AuditReportData {
  mission: MissionDetail
  members: MissionMemberRow[]
  domains: DomainWithControls[]
  assessments: AssessmentWithControl[]
  client: CabinetClient | null
  cabinetName: string
  cabinetLogoUrl?: string | null
}

// ── Palette ────────────────────────────────────────────────────────────────
type RGB = [number, number, number]
const FOREST_900: RGB = [13, 47, 35]
const FOREST_700: RGB = [27, 67, 50]
const FOREST_500: RGB = [45, 106, 79]
const FOREST_50: RGB = [240, 253, 244]
const GOLD_500: RGB = [212, 168, 67]
const GOLD_50: RGB = [253, 248, 232]
const TEXT_900: RGB = [26, 26, 26]
const TEXT_700: RGB = [55, 65, 81]
const TEXT_500: RGB = [107, 114, 128]
const TEXT_400: RGB = [156, 163, 175]
const BORDER: RGB = [229, 231, 235]
const WHITE: RGB = [255, 255, 255]
const RED: RGB = [192, 57, 43]
const RED_50: RGB = [254, 242, 242]
const ORANGE: RGB = [230, 126, 34]
const ORANGE_50: RGB = [255, 247, 237]
const BLUE: RGB = [37, 99, 235]
const BLUE_50: RGB = [239, 246, 255]
const GREEN: RGB = [39, 174, 96]
const GREEN_50: RGB = [236, 253, 245]

// ── Pondération conformité (alignée sur close-mission edge fn) ────────────
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
  const cabinetLogo = data.cabinetLogoUrl ? await loadImageAsDataURL(data.cabinetLogoUrl) : null

  drawCoverPage(ctx, clientLogo, cabinetLogo)
  drawSection01ExecutiveSummary(ctx)
  drawSection02Scope(ctx)
  drawSection03DomainScores(ctx)
  drawSection04Findings(ctx)
  drawSection05Recommendations(ctx)
  drawSection06ActionPlan(ctx)
  drawSection07Conclusion(ctx)
  addPageNum(ctx)

  const safeName = data.mission.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)
  doc.save(`Rapport_audit_${safeName}.pdf`)
}

// ── Context ────────────────────────────────────────────────────────────────

interface DocContext {
  doc: jsPDF
  data: AuditReportData
  pageW: number
  pageH: number
  marginL: number
  marginR: number
  contentW: number
  y: number
  totals: AuditTotals
  domainStats: DomainStat[]
  roleLabel: (role: string) => string
}

interface AuditTotals {
  totalControls: number
  assessed: number
  conformes: number    // level=c
  largement: number    // level=lc
  partiels: number     // level=pc
  nonConformes: number // level=nc
  na: number
  ncMajor: number
  ncMinor: number
  observations: number
  conformityScore: number // pondéré
}

interface DomainStat {
  code: string
  name: string
  total: number
  scored: number
  score: number
  conformes: number
  ncMajor: number
  ncMinor: number
}

function createContext(doc: jsPDF, data: AuditReportData): DocContext {
  const pageW = 210, pageH = 297, marginL = 18, marginR = 18
  const totals = computeTotals(data.assessments)
  const domainStats = computeDomainStats(data.domains, data.assessments)
  const roleLabel = (role: string): string => ROLE_LABELS[role] ?? role
  return {
    doc, data, pageW, pageH, marginL, marginR,
    contentW: pageW - marginL - marginR,
    y: 0,
    totals, domainStats, roleLabel,
  }
}

function computeTotals(assessments: AssessmentWithControl[]): AuditTotals {
  let assessed = 0, c = 0, lc = 0, pc = 0, nc = 0, na = 0
  let ncMajor = 0, ncMinor = 0, observations = 0
  let scoreSum = 0, scoreCount = 0
  for (const a of assessments) {
    assessed++
    switch (a.conformity_level) {
      case 'c':  c++; break
      case 'lc': lc++; break
      case 'pc': pc++; break
      case 'nc': nc++; break
      case 'na': na++; break
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
    totalControls: assessments.length,
    assessed,
    conformes: c, largement: lc, partiels: pc, nonConformes: nc, na,
    ncMajor, ncMinor, observations,
    conformityScore: scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0,
  }
}

function computeDomainStats(domains: DomainWithControls[], assessments: AssessmentWithControl[]): DomainStat[] {
  const byControl = new Map(assessments.map((a) => [a.control_id, a]))
  return domains.map((d) => {
    let scored = 0, sum = 0, conformes = 0, ncMajor = 0, ncMinor = 0
    for (const c of d.controls) {
      const a = byControl.get(c.id)
      if (!a) continue
      const w = conformityWeight(a.conformity_level)
      if (w !== null) { sum += w; scored++ }
      if (a.conformity_level === 'c') conformes++
      if (a.finding_classification === 'major_nc') ncMajor++
      if (a.finding_classification === 'minor_nc') ncMinor++
    }
    return {
      code: d.code, name: d.name, total: d.controls.length,
      scored, score: scored > 0 ? Math.round(sum / scored) : 0,
      conformes, ncMajor, ncMinor,
    }
  })
}

// ── Pagination + primitives ────────────────────────────────────────────────

function checkPage(ctx: DocContext, needed: number): void {
  if (ctx.y + needed > ctx.pageH - 18) {
    addPageNum(ctx)
    ctx.doc.addPage()
    ctx.y = 18
  }
}

function addPageNum(ctx: DocContext): void {
  const total = ctx.doc.getNumberOfPages()
  ctx.doc.setFontSize(7.5)
  ctx.doc.setTextColor(...TEXT_400)
  ctx.doc.text(`${total}`, ctx.pageW - ctx.marginR, ctx.pageH - 8, { align: 'right' })
}

function fillRect(doc: jsPDF, x: number, y: number, w: number, h: number, color: RGB): void {
  doc.setFillColor(...color)
  doc.rect(x, y, w, h, 'F')
}

function fillRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, color: RGB): void {
  doc.setFillColor(...color)
  doc.roundedRect(x, y, w, h, r, r, 'F')
}

function strokeRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, color: RGB, lineWidth = 0.3): void {
  doc.setDrawColor(...color)
  doc.setLineWidth(lineWidth)
  doc.roundedRect(x, y, w, h, r, r, 'S')
}

function setText(doc: jsPDF, color: RGB, size: number, weight: 'normal' | 'bold' = 'normal'): void {
  doc.setFontSize(size)
  doc.setFont('helvetica', weight)
  doc.setTextColor(...color)
}

function writeWrapped(ctx: DocContext, text: string, opts: { size?: number; color?: RGB; lineHeight?: number; weight?: 'normal' | 'bold'; indent?: number } = {}): void {
  const { size = 9.5, color = TEXT_700, lineHeight = 4.6, weight = 'normal', indent = 0 } = opts
  setText(ctx.doc, color, size, weight)
  const lines = ctx.doc.splitTextToSize(text, ctx.contentW - indent) as string[]
  for (const line of lines) {
    checkPage(ctx, lineHeight)
    ctx.doc.text(line, ctx.marginL + indent, ctx.y)
    ctx.y += lineHeight
  }
}

function drawSectionBanner(ctx: DocContext, num: string, title: string, lead: string): void {
  checkPage(ctx, 28)
  const { doc, marginL, contentW } = ctx
  fillRoundedRect(doc, marginL, ctx.y, contentW, 22, 2.2, FOREST_900)
  fillRoundedRect(doc, marginL, ctx.y, 4, 22, 2.2, GOLD_500)
  setText(doc, GOLD_500, 9, 'bold')
  doc.text(num, marginL + 8, ctx.y + 8)
  setText(doc, WHITE, 13, 'bold')
  doc.text(title, marginL + 8, ctx.y + 14)
  setText(doc, WHITE, 8, 'normal')
  doc.text(lead, marginL + 8, ctx.y + 19)
  ctx.y += 28
}

function drawH3(ctx: DocContext, title: string): void {
  checkPage(ctx, 8)
  setText(ctx.doc, FOREST_900, 11, 'bold')
  ctx.doc.text(title, ctx.marginL, ctx.y)
  ctx.y += 6
}

function drawKpi(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, sub: string, color: RGB = FOREST_700): void {
  fillRoundedRect(doc, x, y, w, h, 2.4, WHITE)
  strokeRoundedRect(doc, x, y, w, h, 2.4, BORDER, 0.4)
  setText(doc, TEXT_500, 7.5, 'bold')
  doc.text(label.toUpperCase(), x + 4, y + 5.5)
  setText(doc, color, 18, 'bold')
  doc.text(value, x + 4, y + 16)
  setText(doc, TEXT_500, 7.5, 'normal')
  doc.text(sub, x + 4, y + h - 3.5)
}

// ── Couverture ─────────────────────────────────────────────────────────────

interface LogoData { dataUrl: string; width: number; height: number; format: 'PNG' | 'JPEG' | 'WEBP' }

function drawCoverPage(ctx: DocContext, clientLogo: LogoData | null, cabinetLogo: LogoData | null): void {
  const { doc, data, pageW, pageH, marginL } = ctx

  fillRect(doc, 0, 0, pageW, 110, FOREST_900)
  fillRect(doc, 0, 110, pageW, 1.5, GOLD_500)

  // Logo cabinet en haut à gauche (sur fond foncé : on met un cartouche blanc)
  if (cabinetLogo) {
    const lw = 36, lh = 18
    fillRoundedRect(doc, marginL, 18, lw + 4, lh + 4, 1.5, WHITE)
    doc.addImage(cabinetLogo.dataUrl, cabinetLogo.format, marginL + 2, 20, lw, lh, undefined, 'FAST')
  } else {
    setText(doc, WHITE, 9, 'bold')
    doc.text(data.cabinetName.toUpperCase(), marginL, 25)
  }

  // Étiquette
  setText(doc, GOLD_500, 9, 'bold')
  doc.text('RAPPORT D’AUDIT', marginL, 60)

  // Titre
  setText(doc, WHITE, 22, 'bold')
  const title = `Audit ${data.mission.framework_name ?? ''}`
  doc.text(title, marginL, 73)

  setText(doc, WHITE, 14, 'normal')
  doc.text(data.client?.name ?? data.mission.client_name ?? '—', marginL, 84)

  // Dates
  setText(doc, WHITE, 9, 'normal')
  const dateRange = formatPeriod(data.mission.start_date, data.mission.end_date)
  doc.text(`Période d'audit : ${dateRange}`, marginL, 95)

  // Logo client en bas
  if (clientLogo) {
    const maxW = 40, maxH = 22
    const ratio = clientLogo.width / clientLogo.height
    let lw = maxW, lh = maxW / ratio
    if (lh > maxH) { lh = maxH; lw = maxH * ratio }
    fillRoundedRect(doc, marginL, pageH - 50, lw + 4, lh + 4, 1.5, WHITE)
    doc.addImage(clientLogo.dataUrl, clientLogo.format, marginL + 2, pageH - 48, lw, lh, undefined, 'FAST')
  }

  setText(doc, TEXT_500, 8, 'normal')
  doc.text('Document confidentiel — Diffusion restreinte', marginL, pageH - 22)
  doc.text(`Émis le ${formatDate(new Date().toISOString())}`, marginL, pageH - 17)

  // Lead/associé en bas droite
  const lead = ctx.data.members.find((m) => m.role === 'lead_auditor')
  const associate = ctx.data.members.find((m) => m.role === 'associate')
  setText(doc, TEXT_500, 8, 'bold')
  doc.text('Équipe d’audit', pageW - 18, pageH - 35, { align: 'right' })
  setText(doc, TEXT_700, 9, 'normal')
  doc.text(lead ? `Chef de mission : ${memberName(lead)}` : '—', pageW - 18, pageH - 30, { align: 'right' })
  if (associate) doc.text(`Associé : ${memberName(associate)}`, pageW - 18, pageH - 25, { align: 'right' })

  ctx.doc.addPage()
  ctx.y = 18
}

// ── Section 1 — Synthèse exécutive ─────────────────────────────────────────

function drawSection01ExecutiveSummary(ctx: DocContext): void {
  drawSectionBanner(ctx, '01', 'Synthèse exécutive', "Verdict global de l'audit, score de conformité, points clés")

  const { doc, marginL, contentW, totals } = ctx
  const verdict = computeVerdict(totals.conformityScore)

  // Bloc score + verdict
  const blockH = 38
  fillRoundedRect(doc, marginL, ctx.y, contentW, blockH, 3, FOREST_50)
  strokeRoundedRect(doc, marginL, ctx.y, contentW, blockH, 3, BORDER, 0.3)

  setText(doc, TEXT_500, 8, 'bold')
  doc.text('SCORE DE CONFORMITÉ', marginL + 6, ctx.y + 9)
  setText(doc, verdict.color, 32, 'bold')
  doc.text(`${totals.conformityScore}%`, marginL + 6, ctx.y + 26)
  setText(doc, TEXT_500, 7.5, 'normal')
  doc.text('Pondération c=100 / lc=75 / pc=50 / nc=0 — NA exclus', marginL + 6, ctx.y + 33)

  // Verdict à droite
  const vx = marginL + contentW - 78
  fillRoundedRect(doc, vx, ctx.y + 6, 72, blockH - 12, 2, verdict.bg)
  setText(doc, TEXT_500, 7.5, 'bold')
  doc.text('VERDICT', vx + 4, ctx.y + 13)
  setText(doc, verdict.color, 13, 'bold')
  doc.text(verdict.label, vx + 4, ctx.y + 22)
  setText(doc, TEXT_700, 8, 'normal')
  const vlines = doc.splitTextToSize(verdict.summary, 64) as string[]
  let vy = ctx.y + 27
  for (const line of vlines.slice(0, 2)) { doc.text(line, vx + 4, vy); vy += 4 }

  ctx.y += blockH + 8

  // KPI row
  const kpiH = 24, kpiGap = 4
  const kpiW = (contentW - kpiGap * 3) / 4
  drawKpi(doc, marginL + 0 * (kpiW + kpiGap), ctx.y, kpiW, kpiH, 'Contrôles', `${totals.totalControls}`, 'évalués', FOREST_700)
  drawKpi(doc, marginL + 1 * (kpiW + kpiGap), ctx.y, kpiW, kpiH, 'Conformes', `${totals.conformes}`, 'level c', GREEN)
  drawKpi(doc, marginL + 2 * (kpiW + kpiGap), ctx.y, kpiW, kpiH, 'NC majeures', `${totals.ncMajor}`, 'à traiter', RED)
  drawKpi(doc, marginL + 3 * (kpiW + kpiGap), ctx.y, kpiW, kpiH, 'NC mineures', `${totals.ncMinor}`, 'à corriger', ORANGE)
  ctx.y += kpiH + 10

  // Texte de synthèse
  drawH3(ctx, 'Lecture rapide')
  writeWrapped(ctx, generateExecutiveText(ctx))
  ctx.y += 4

  // Encadré conclusion (si déjà saisie)
  const conclusion = (ctx.data.mission as unknown as { audit_conclusion?: string | null }).audit_conclusion
  if (conclusion) {
    fillRoundedRect(doc, marginL, ctx.y, contentW, 10, 2, GOLD_50)
    strokeRoundedRect(doc, marginL, ctx.y, contentW, 10, 2, GOLD_500, 0.3)
    setText(doc, FOREST_900, 8.5, 'bold')
    doc.text(`Conclusion d'audit : ${labelConclusion(conclusion)}`, marginL + 4, ctx.y + 6.5)
    ctx.y += 14
  }
}

function computeVerdict(score: number): { label: string; color: RGB; bg: RGB; summary: string } {
  if (score >= 80) return { label: 'Favorable', color: GREEN, bg: GREEN_50, summary: 'Conformité solide. Quelques améliorations à intégrer.' }
  if (score >= 60) return { label: 'Réservée', color: ORANGE, bg: ORANGE_50, summary: 'Conformité partielle. Plan d\'action requis sur les écarts.' }
  return { label: 'Défavorable', color: RED, bg: RED_50, summary: 'Conformité insuffisante. Remédiation urgente attendue.' }
}

function labelConclusion(key: string): string {
  switch (key) {
    case 'favorable': return 'Favorable'
    case 'favorable_reserves': return 'Favorable avec réserves'
    case 'unfavorable': return 'Défavorable'
    default: return key
  }
}

function generateExecutiveText(ctx: DocContext): string {
  const { totals, data } = ctx
  const fwName = data.mission.framework_name ?? 'le référentiel applicable'
  const period = formatPeriod(data.mission.start_date, data.mission.end_date)
  const conformityNote = totals.conformityScore >= 80
    ? `démontre une appropriation aboutie des exigences ${fwName}`
    : totals.conformityScore >= 60
    ? `révèle une appropriation partielle, avec des marges de progression notables`
    : `met en évidence des écarts significatifs nécessitant un plan de remédiation`
  return `L'audit conduit par ${ctx.data.cabinetName} sur la période ${period} a couvert ${totals.totalControls} contrôles du référentiel ${fwName}. Le résultat global ${conformityNote}, avec un score pondéré de ${totals.conformityScore}%. ${totals.ncMajor} non-conformités majeures et ${totals.ncMinor} mineures ont été identifiées, complétées par ${totals.observations} observations. Le détail par domaine, les constats individuels ainsi que les recommandations associées sont présentés dans les sections suivantes. Le plan d'action de remédiation est fourni en section 6 et son suivi est accessible directement sur la plateforme.`
}

// ── Section 2 — Périmètre ──────────────────────────────────────────────────

function drawSection02Scope(ctx: DocContext): void {
  drawSectionBanner(ctx, '02', 'Périmètre audité', 'Référentiel, contrôles couverts, équipe, méthodologie')

  drawH3(ctx, 'Référentiel et durée')
  const fw = ctx.data.mission.framework_name ?? '—'
  writeWrapped(ctx, `Référentiel : ${fw}\nDurée : ${formatPeriod(ctx.data.mission.start_date, ctx.data.mission.end_date)}\nNombre total de contrôles : ${ctx.totals.totalControls}\nContrôles évalués : ${ctx.totals.assessed} (${pct(ctx.totals.assessed, ctx.totals.totalControls)}%)`)
  ctx.y += 3

  drawH3(ctx, 'Équipe d’audit')
  for (const m of ctx.data.members) {
    const line = `• ${ctx.roleLabel(m.role)} — ${memberName(m)}`
    writeWrapped(ctx, line, { lineHeight: 4.5 })
  }
  ctx.y += 4

  drawH3(ctx, 'Méthodologie')
  writeWrapped(ctx, [
    '• Revue documentaire des politiques, procédures et enregistrements,',
    '• Entretiens avec les responsables des processus en périmètre,',
    '• Tests d’efficacité par échantillonnage sur les contrôles critiques,',
    '• Inspection physique des dispositifs lorsque pertinent,',
    '• Analyse des indicateurs et journaux d’audit existants.',
  ].join('\n'), { lineHeight: 4.6 })
  ctx.y += 4
}

// ── Section 3 — Score par domaine ──────────────────────────────────────────

function drawSection03DomainScores(ctx: DocContext): void {
  drawSectionBanner(ctx, '03', 'Score par domaine', "Conformité pondérée et compteurs de non-conformités par grand domaine")

  const { doc, marginL, contentW } = ctx
  const rowH = 14
  for (const d of ctx.domainStats) {
    checkPage(ctx, rowH + 2)
    fillRoundedRect(doc, marginL, ctx.y, contentW, rowH, 2, WHITE)
    strokeRoundedRect(doc, marginL, ctx.y, contentW, rowH, 2, BORDER, 0.3)

    setText(doc, FOREST_900, 9, 'bold')
    doc.text(`${d.code} — ${truncate(d.name, 60)}`, marginL + 4, ctx.y + 5.5)

    setText(doc, TEXT_500, 8, 'normal')
    doc.text(`${d.scored}/${d.total} évalués · ${d.conformes} conformes · ${d.ncMajor} NC maj · ${d.ncMinor} NC min`, marginL + 4, ctx.y + 11)

    // Barre + score
    const barX = marginL + contentW - 60, barY = ctx.y + 4, barW = 40, barH = 5
    fillRoundedRect(doc, barX, barY, barW, barH, 1, BORDER)
    const scoreColor = d.score >= 80 ? GREEN : d.score >= 60 ? GOLD_500 : RED
    fillRoundedRect(doc, barX, barY, (barW * d.score) / 100, barH, 1, scoreColor)
    setText(doc, scoreColor, 11, 'bold')
    doc.text(`${d.score}%`, marginL + contentW - 4, ctx.y + 9, { align: 'right' })

    ctx.y += rowH + 2
  }
}

// ── Section 4 — Synthèse des constats ──────────────────────────────────────

function drawSection04Findings(ctx: DocContext): void {
  drawSectionBanner(ctx, '04', 'Synthèse des constats', "Détail des non-conformités majeures et mineures relevées")

  const { totals, data, marginL, contentW, doc } = ctx
  // Bandeau compteurs
  const cellW = (contentW - 6) / 4, cellH = 18
  drawCounterCell(doc, marginL + 0 * (cellW + 2), ctx.y, cellW, cellH, `${totals.conformes}`, 'Conformes', GREEN, GREEN_50)
  drawCounterCell(doc, marginL + 1 * (cellW + 2), ctx.y, cellW, cellH, `${totals.observations}`, 'Observations', BLUE, BLUE_50)
  drawCounterCell(doc, marginL + 2 * (cellW + 2), ctx.y, cellW, cellH, `${totals.ncMinor}`, 'NC mineures', ORANGE, ORANGE_50)
  drawCounterCell(doc, marginL + 3 * (cellW + 2), ctx.y, cellW, cellH, `${totals.ncMajor}`, 'NC majeures', RED, RED_50)
  ctx.y += cellH + 8

  // Détail NC majeures
  const majors = data.assessments.filter((a) => a.finding_classification === 'major_nc')
  if (majors.length > 0) {
    drawH3(ctx, 'Non-conformités majeures (détail)')
    for (const a of majors) {
      drawFindingCard(ctx, a, 'major')
    }
  }

  // Détail NC mineures (résumé)
  const minors = data.assessments.filter((a) => a.finding_classification === 'minor_nc')
  if (minors.length > 0) {
    drawH3(ctx, 'Non-conformités mineures')
    drawTable(ctx,
      ['Réf.', 'Contrôle', 'Constat (extrait)'],
      minors.slice(0, 30).map((a) => [a.control.code, truncate(a.control.name, 32), truncate(a.findings ?? '—', 90)]),
      [22, 60, 88],
    )
    if (minors.length > 30) {
      writeWrapped(ctx, `(${minors.length - 30} autres NC mineures non listées ici, voir l'export Excel du plan d'action.)`, { color: TEXT_500, size: 8.5 })
    }
  }

  // Observations
  const obs = data.assessments.filter((a) => a.finding_classification === 'observation')
  if (obs.length > 0) {
    drawH3(ctx, `Observations (${obs.length})`)
    drawTable(ctx,
      ['Réf.', 'Contrôle', 'Observation (extrait)'],
      obs.slice(0, 25).map((a) => [a.control.code, truncate(a.control.name, 32), truncate(a.findings ?? '—', 90)]),
      [22, 60, 88],
    )
  }
}

function drawCounterCell(doc: jsPDF, x: number, y: number, w: number, h: number, value: string, label: string, fg: RGB, bg: RGB): void {
  fillRoundedRect(doc, x, y, w, h, 2, bg)
  strokeRoundedRect(doc, x, y, w, h, 2, fg, 0.3)
  setText(doc, fg, 16, 'bold')
  doc.text(value, x + 4, y + 11)
  setText(doc, TEXT_700, 8, 'normal')
  doc.text(label, x + 4, y + h - 3)
}

function drawFindingCard(ctx: DocContext, a: AssessmentWithControl, severity: 'major' | 'minor'): void {
  const accent = severity === 'major' ? RED : ORANGE
  const bg = severity === 'major' ? RED_50 : ORANGE_50
  const text = a.findings ?? 'Aucun détail saisi.'
  const lines = ctx.doc.splitTextToSize(text, ctx.contentW - 10) as string[]
  const cardH = 16 + lines.length * 4.4
  checkPage(ctx, cardH + 4)
  fillRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, cardH, 2, bg)
  fillRoundedRect(ctx.doc, ctx.marginL, ctx.y, 3, cardH, 2, accent)
  setText(ctx.doc, accent, 9, 'bold')
  ctx.doc.text(`${a.control.code} — ${truncate(a.control.name, 55)}`, ctx.marginL + 7, ctx.y + 6)
  setText(ctx.doc, TEXT_700, 8.5, 'normal')
  let ly = ctx.y + 12
  for (const line of lines) { ctx.doc.text(line, ctx.marginL + 7, ly); ly += 4.4 }
  ctx.y += cardH + 3
}

// ── Section 5 — Recommandations ────────────────────────────────────────────

function drawSection05Recommendations(ctx: DocContext): void {
  drawSectionBanner(ctx, '05', 'Recommandations', "Actions prioritaires identifiées par l'auditeur")

  // Top 10 par classification : majors d'abord, puis minors, puis observations
  const order = (a: AssessmentWithControl): number => {
    if (a.finding_classification === 'major_nc') return 0
    if (a.finding_classification === 'minor_nc') return 1
    if (a.finding_classification === 'observation') return 2
    return 3
  }
  const top = ctx.data.assessments
    .filter((a) => (a.recommendations ?? '').trim().length > 0)
    .sort((a, b) => order(a) - order(b))
    .slice(0, 10)

  if (top.length === 0) {
    writeWrapped(ctx, 'Aucune recommandation explicite n’a été enregistrée. Se référer au plan d’action de la section suivante.', { color: TEXT_500 })
    return
  }

  let i = 1
  for (const a of top) {
    const priorityLabel = a.finding_classification === 'major_nc' ? 'P1' : a.finding_classification === 'minor_nc' ? 'P2' : 'P3'
    const priorityColor = a.finding_classification === 'major_nc' ? RED : a.finding_classification === 'minor_nc' ? ORANGE : BLUE

    const text = a.recommendations ?? '—'
    const lines = ctx.doc.splitTextToSize(text, ctx.contentW - 18) as string[]
    const cardH = 14 + lines.length * 4.4
    checkPage(ctx, cardH + 3)

    fillRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, cardH, 2, WHITE)
    strokeRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, cardH, 2, BORDER, 0.3)

    // Numéro
    fillRoundedRect(ctx.doc, ctx.marginL + 4, ctx.y + 3, 8, 8, 1.5, FOREST_700)
    setText(ctx.doc, WHITE, 8, 'bold')
    ctx.doc.text(`${i}`, ctx.marginL + 8, ctx.y + 8.7, { align: 'center' })

    // Priorité
    const px = ctx.marginL + 14
    fillRoundedRect(ctx.doc, px, ctx.y + 3, 11, 5, 1, priorityColor)
    setText(ctx.doc, WHITE, 7, 'bold')
    ctx.doc.text(priorityLabel, px + 5.5, ctx.y + 6.5, { align: 'center' })

    // Contrôle
    setText(ctx.doc, FOREST_900, 9, 'bold')
    ctx.doc.text(`${a.control.code} — ${truncate(a.control.name, 50)}`, ctx.marginL + 28, ctx.y + 7)

    // Reco
    setText(ctx.doc, TEXT_700, 8.5, 'normal')
    let ly = ctx.y + 13
    for (const line of lines) { ctx.doc.text(line, ctx.marginL + 8, ly); ly += 4.4 }

    ctx.y += cardH + 2
    i++
  }
}

// ── Section 6 — Plan d'action ──────────────────────────────────────────────

function drawSection06ActionPlan(ctx: DocContext): void {
  drawSectionBanner(ctx, '06', "Plan d'action", "Récapitulatif des actions de remédiation à suivre côté entité auditée")

  const items = ctx.data.assessments.filter((a) =>
    a.finding_classification === 'major_nc'
    || a.finding_classification === 'minor_nc'
    || a.finding_classification === 'observation'
  )

  if (items.length === 0) {
    writeWrapped(ctx, 'Aucune action de remédiation requise : la mission ne présente pas de non-conformité ni d’observation.', { color: TEXT_500 })
    return
  }

  writeWrapped(ctx, `Le plan d'action ci-dessous récapitule les ${items.length} actions de remédiation identifiées au cours de l'audit. Il est suivi sur la plateforme : chaque item devient une demande d'action corrective (CAR) à laquelle l'entité auditée doit répondre (cause racine, action, échéance), avant vérification par l'auditeur.`)
  ctx.y += 3

  // Compte par priorité
  const p1 = items.filter((a) => a.finding_classification === 'major_nc').length
  const p2 = items.filter((a) => a.finding_classification === 'minor_nc').length
  const p3 = items.filter((a) => a.finding_classification === 'observation').length
  drawH3(ctx, `Synthèse — ${p1} P1 · ${p2} P2 · ${p3} P3`)

  // Table compacte
  drawTable(ctx,
    ['Réf.', 'Domaine', 'Type', 'Description (extrait)'],
    items.slice(0, 40).map((a) => {
      const dom = ctx.domainStats.find((d) => ctx.data.domains.find((dd) => dd.code === d.code)?.controls.some((c) => c.id === a.control_id))
      return [
        a.control.code,
        dom?.code ?? '—',
        a.finding_classification === 'major_nc' ? 'NC maj' : a.finding_classification === 'minor_nc' ? 'NC min' : 'Obs.',
        truncate(a.findings ?? '—', 80),
      ]
    }),
    [22, 22, 18, 108],
  )
  if (items.length > 40) {
    writeWrapped(ctx, `(${items.length - 40} actions supplémentaires accessibles via l'export Excel du plan d'action.)`, { color: TEXT_500, size: 8.5 })
  }
}

// ── Section 7 — Conclusion + signataires ───────────────────────────────────

function drawSection07Conclusion(ctx: DocContext): void {
  drawSectionBanner(ctx, '07', 'Conclusion et signataires', "Verdict final et signatures des parties prenantes")

  const concl = (ctx.data.mission as unknown as { audit_conclusion?: string | null; audit_conclusion_comment?: string | null })
  const verdict = computeVerdict(ctx.totals.conformityScore)

  drawH3(ctx, 'Conclusion d’audit')
  const text = concl.audit_conclusion_comment?.trim() ||
    `À l'issue de l'audit conduit sur la période ${formatPeriod(ctx.data.mission.start_date, ctx.data.mission.end_date)}, et au regard des constats détaillés dans les sections précédentes, la mission est conclue avec un score pondéré de ${ctx.totals.conformityScore}%. Le verdict est ${verdict.label.toLowerCase()}.`
  writeWrapped(ctx, text)

  if (concl.audit_conclusion) {
    fillRoundedRect(ctx.doc, ctx.marginL, ctx.y + 2, ctx.contentW, 10, 2, GOLD_50)
    strokeRoundedRect(ctx.doc, ctx.marginL, ctx.y + 2, ctx.contentW, 10, 2, GOLD_500, 0.3)
    setText(ctx.doc, FOREST_900, 9, 'bold')
    ctx.doc.text(`Verdict officiel : ${labelConclusion(concl.audit_conclusion)}`, ctx.marginL + 4, ctx.y + 8.5)
    ctx.y += 16
  }

  drawH3(ctx, 'Signatures')
  const lead = ctx.data.members.find((m) => m.role === 'lead_auditor')
  const associate = ctx.data.members.find((m) => m.role === 'associate')

  const cardW = (ctx.contentW - 8) / 3, cardH = 36
  drawSignatureCard(ctx.doc, ctx.marginL + 0 * (cardW + 4), ctx.y, cardW, cardH, 'Chef de mission', lead ? memberName(lead) : '—', ctx.data.cabinetName)
  drawSignatureCard(ctx.doc, ctx.marginL + 1 * (cardW + 4), ctx.y, cardW, cardH, 'Associé', associate ? memberName(associate) : '—', ctx.data.cabinetName)
  drawSignatureCard(ctx.doc, ctx.marginL + 2 * (cardW + 4), ctx.y, cardW, cardH, 'Pour l’entité auditée', '—', ctx.data.client?.name ?? ctx.data.mission.client_name ?? '—')
  ctx.y += cardH + 4
}

function drawSignatureCard(doc: jsPDF, x: number, y: number, w: number, h: number, role: string, name: string, fn: string): void {
  fillRoundedRect(doc, x, y, w, h, 2, WHITE)
  strokeRoundedRect(doc, x, y, w, h, 2, BORDER, 0.3)
  setText(doc, TEXT_500, 7.5, 'bold')
  doc.text(role.toUpperCase(), x + 4, y + 6)
  // Cadre signature
  fillRect(doc, x + 4, y + 9, w - 8, 18, [248, 250, 252])
  strokeRoundedRect(doc, x + 4, y + 9, w - 8, 18, 1, BORDER, 0.2)
  setText(doc, TEXT_900, 8.5, 'bold')
  doc.text(name, x + 4, y + h - 6)
  setText(doc, TEXT_500, 7.5, 'normal')
  doc.text(fn, x + 4, y + h - 2)
}

// ── Generic helpers ────────────────────────────────────────────────────────

function drawTable(ctx: DocContext, headers: string[], rows: string[][], widths: number[]): void {
  const { doc, marginL } = ctx
  const headerH = 7, rowH = 6
  const totalW = widths.reduce((s, w) => s + w, 0)

  checkPage(ctx, headerH + rowH * Math.min(rows.length, 3))
  fillRect(doc, marginL, ctx.y, totalW, headerH, FOREST_900)
  setText(doc, WHITE, 8, 'bold')
  let cx = marginL
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], cx + 2, ctx.y + 4.8)
    cx += widths[i]
  }
  ctx.y += headerH

  setText(doc, TEXT_700, 8, 'normal')
  let zebra = false
  for (const row of rows) {
    checkPage(ctx, rowH)
    if (zebra) fillRect(doc, marginL, ctx.y, totalW, rowH, [250, 250, 248])
    cx = marginL
    for (let i = 0; i < row.length; i++) {
      doc.text(row[i], cx + 2, ctx.y + 4)
      cx += widths[i]
    }
    ctx.y += rowH
    zebra = !zebra
  }
  ctx.y += 2
}

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

function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0
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
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('FileReader error'))
      reader.readAsDataURL(blob)
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
