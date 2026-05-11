import jsPDF from 'jspdf'
import type { MissionDetail, MissionMemberRow } from '../missions/useMissionDetail'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'
import type { MissionExclusion, MissionRisk, CabinetClient } from '../../types/database.types'
import { ROLE_LABELS } from '../missions/mission-constants'

/**
 * Générateur PDF de la Note de Cadrage — visuel "Mockup B révisé".
 *
 * Toutes les données sont tirées de la BDD existante (missions,
 * cabinet_clients, mission_members, mission_risks, mission_exclusions,
 * domains, framework). Les sections de méthodologie / RACI / hypothèses
 * sont des templates standards du cabinet enrichis automatiquement à
 * partir du contexte (framework, réglementations, secteur).
 */

export interface ScopingNoteData {
  mission: MissionDetail
  members: MissionMemberRow[]
  domains: DomainWithControls[]
  exclusions: MissionExclusion[]
  risks: MissionRisk[]
  client: CabinetClient | null
  questionnaireProgress: number
  documentsReceived: number
  documentsExpected: number
  reviewLabels?: { lead: string; associate: string }
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
const BG: RGB = [250, 250, 248]
const RED: RGB = [192, 57, 43]
const RED_50: RGB = [254, 242, 242]
const ORANGE: RGB = [230, 126, 34]
const ORANGE_50: RGB = [255, 247, 237]
const BLUE: RGB = [37, 99, 235]

// ── Public API ─────────────────────────────────────────────────────────────

export async function generateScopingNotePDF(data: ScopingNoteData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const ctx = createContext(doc, data)

  // Pré-charge le logo client (best effort — silencieux si KO)
  const clientLogo = data.client?.logo_url ? await loadImageAsDataURL(data.client.logo_url) : null

  drawCoverPage(ctx, clientLogo)

  drawSection01Preambule(ctx)
  drawSection02Objectifs(ctx)
  drawSection03Perimetre(ctx)
  drawSection04Methodologie(ctx)
  drawSection05Risques(ctx)
  drawSection06Equipe(ctx)
  drawSection07Planning(ctx)
  drawSection08LivrablesGouvernance(ctx)
  drawSection09Hypotheses(ctx)
  drawSection10Signatures(ctx)

  const safeName = data.mission.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)
  doc.save(`Note_cadrage_${safeName}.pdf`)
}

// ── Context shared across sections ─────────────────────────────────────────

interface DocContext {
  doc: jsPDF
  data: ScopingNoteData
  pageW: number
  pageH: number
  marginL: number
  marginR: number
  contentW: number
  y: number
  // computed once
  includedControls: number
  totalControls: number
  excludedIds: Set<string>
  durationWeeks: number
  roleLabel: (role: string) => string
}

function createContext(doc: jsPDF, data: ScopingNoteData): DocContext {
  const pageW = 210
  const pageH = 297
  const marginL = 18
  const marginR = 18
  const excludedIds = new Set(data.exclusions.map((e) => e.control_id))
  const totalControls = data.domains.reduce((s, d) => s + d.controls.length, 0)
  const includedControls = totalControls - excludedIds.size
  const durationWeeks = computeDurationWeeks(data.mission.start_date, data.mission.end_date)
  const roleLabel = (role: string): string => {
    if (data.reviewLabels) {
      if (role === 'lead_auditor') return data.reviewLabels.lead
      if (role === 'associate') return data.reviewLabels.associate
    }
    return ROLE_LABELS[role] ?? role
  }
  return {
    doc, data, pageW, pageH, marginL, marginR,
    contentW: pageW - marginL - marginR,
    y: 0,
    includedControls, totalControls, excludedIds, durationWeeks, roleLabel,
  }
}

// ── Pagination helpers ─────────────────────────────────────────────────────

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

// ── Drawing primitives ─────────────────────────────────────────────────────

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

// Wrap text and write line by line, paginating as needed.
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

// ── Cover page ─────────────────────────────────────────────────────────────

interface LogoData {
  dataUrl: string
  width: number
  height: number
  format: 'PNG' | 'JPEG' | 'WEBP'
}

function drawCoverPage(ctx: DocContext, clientLogo: LogoData | null): void {
  const { doc, data, pageW, pageH, marginL } = ctx
  const contentW = pageW - marginL - ctx.marginR

  // Hero band
  fillRect(doc, 0, 0, pageW, 100, FOREST_900)
  fillRect(doc, 0, 100, pageW, 1.5, GOLD_500)

  // Logo client en haut à droite (si disponible). Fond blanc arrondi pour
  // garantir la lisibilité quel que soit le coloris du logo.
  if (clientLogo) {
    const maxW = 30
    const maxH = 18
    const ratio = clientLogo.width / clientLogo.height
    let lw = maxW
    let lh = maxW / ratio
    if (lh > maxH) {
      lh = maxH
      lw = maxH * ratio
    }
    const padding = 2
    const boxW = lw + padding * 2
    const boxH = lh + padding * 2
    const boxX = pageW - ctx.marginR - boxW
    const boxY = 14
    fillRoundedRect(doc, boxX, boxY, boxW, boxH, 1, WHITE)
    try {
      doc.addImage(clientLogo.dataUrl, clientLogo.format, boxX + padding, boxY + padding, lw, lh)
    } catch (err) {
      // Format non supporté par jsPDF (ex: SVG) — on a déjà le carré blanc, tant pis pour le visuel
      console.warn('[scoping-pdf] addImage failed:', err)
    }
  }

  // Mission ID pill
  const idLabel = `MISSION · ${data.mission.id.slice(0, 8)} · v1.0`
  setText(doc, GOLD_500, 7.5, 'bold')
  doc.text(idLabel, marginL, 22)

  // Logo
  setText(doc, WHITE, 22, 'bold')
  doc.text('Gëstu', marginL, 36)
  setText(doc, GOLD_500, 7.5, 'bold')
  doc.text('COMPLY', marginL + doc.getTextWidth('Gëstu') + 3, 36)

  // Title
  setText(doc, WHITE, 24, 'bold')
  doc.text('Note de cadrage', marginL, 58)

  // Subtitle
  const fwName = `${data.mission.framework?.name ?? '—'}${data.mission.framework?.version ? ' v' + data.mission.framework.version : ''}`
  const subtitle = doc.splitTextToSize(
    `Évaluation de la conformité du Système de Management de la Sécurité de l'Information aux exigences du référentiel ${fwName}.`,
    contentW,
  ) as string[]
  setText(doc, WHITE, 11, 'normal')
  let sy = 68
  for (const line of subtitle.slice(0, 3)) {
    doc.text(line, marginL, sy)
    sy += 5
  }

  // Client row
  const clientName = data.client?.client_name ?? data.mission.client?.name ?? '—'
  const initial = (clientName[0] ?? '?').toUpperCase()
  // Avatar
  doc.setFillColor(...GOLD_500)
  doc.circle(marginL + 5, 90, 5, 'F')
  setText(doc, FOREST_900, 11, 'bold')
  doc.text(initial, marginL + 5, 92, { align: 'center' })
  setText(doc, WHITE, 11, 'bold')
  doc.text(clientName, marginL + 13, 90)
  const clientMeta: string[] = []
  if (data.client?.client_sector) clientMeta.push(data.client.client_sector)
  if (data.client?.effectifs) clientMeta.push(`${data.client.effectifs} collaborateurs`)
  if (data.client?.client_country) clientMeta.push(data.client.client_country)
  setText(doc, [220, 220, 220], 8.5, 'normal')
  doc.text(clientMeta.join(' · ') || '—', marginL + 13, 95)

  // KPI strip — overlapping the hero
  const kpiY = 110
  const kpiH = 28
  fillRoundedRect(doc, marginL, kpiY, contentW, kpiH, 2, WHITE)
  strokeRoundedRect(doc, marginL, kpiY, contentW, kpiH, 2, BORDER)
  const kpiW = contentW / 4
  drawKpi(doc, marginL, kpiY, kpiW, kpiH, 'Contrôles', String(ctx.includedControls), `/ ${ctx.totalControls}`)
  drawKpi(doc, marginL + kpiW, kpiY, kpiW, kpiH, 'Domaines', String(data.domains.length), 'évalués')
  drawKpi(doc, marginL + kpiW * 2, kpiY, kpiW, kpiH, 'Équipe', String(data.members.length), 'membres')
  drawKpi(doc, marginL + kpiW * 3, kpiY, kpiW, kpiH, 'Durée', `${ctx.durationWeeks}`, 'semaines')

  // Tags
  let tagY = 152
  let tagX = marginL
  const tags: string[] = []
  if (data.mission.framework?.name) tags.push(`${data.mission.framework.name}${data.mission.framework.version ? ' v' + data.mission.framework.version : ''}`)
  if (data.client?.client_sector) tags.push(data.client.client_sector)
  for (const reg of data.client?.exigences_reglementaires?.slice(0, 3) ?? []) {
    tags.push(reg.nom)
  }
  for (const tag of tags) {
    setText(doc, FOREST_700, 8, 'bold')
    const w = doc.getTextWidth(tag) + 6
    if (tagX + w > marginL + contentW) {
      tagX = marginL
      tagY += 7
    }
    fillRoundedRect(doc, tagX, tagY - 4, w, 6, 3, FOREST_50)
    doc.text(tag, tagX + 3, tagY)
    tagX += w + 2
  }

  // Foot — cabinet + contexte
  const footY = 188
  fillRect(doc, marginL, footY, contentW, 0.3, BORDER)
  // Cabinet
  setText(doc, TEXT_500, 7.5, 'bold')
  doc.text('CABINET D\'AUDIT', marginL, footY + 7)
  setText(doc, TEXT_900, 11, 'bold')
  doc.text(data.mission.cabinet?.name ?? '—', marginL, footY + 13)
  const lead = data.members.find((m) => m.role === 'lead_auditor')
  const associate = data.members.find((m) => m.role === 'associate')
  setText(doc, TEXT_500, 8.5, 'normal')
  if (associate) doc.text(`${associate.user.first_name} ${associate.user.last_name} — ${ctx.roleLabel('associate')}`, marginL, footY + 19)
  if (lead) doc.text(`${lead.user.first_name} ${lead.user.last_name} — ${ctx.roleLabel('lead_auditor')}`, marginL, footY + 24)

  // Contexte
  setText(doc, TEXT_500, 7.5, 'bold')
  doc.text('CONTEXTE DE LA MISSION', marginL + contentW / 2, footY + 7)
  const ctxText = generateContextSummary(data)
  setText(doc, TEXT_700, 9, 'normal')
  const ctxLines = doc.splitTextToSize(ctxText, contentW / 2 - 3) as string[]
  let cy = footY + 13
  for (const line of ctxLines.slice(0, 5)) {
    doc.text(line, marginL + contentW / 2, cy)
    cy += 4
  }

  // Classification
  fillRoundedRect(doc, marginL, pageH - 30, contentW, 10, 1.5, GOLD_50)
  setText(doc, GOLD_500, 8, 'bold')
  doc.text('CONFIDENTIEL', marginL + 4, pageH - 24)
  setText(doc, [138, 109, 44], 8, 'normal')
  doc.text('· Distribution restreinte aux parties prenantes de la mission', marginL + 4 + doc.getTextWidth('CONFIDENTIEL') + 1, pageH - 24)

  // Footer
  setText(doc, TEXT_400, 7, 'normal')
  doc.text(`Document généré le ${formatDate(new Date().toISOString())}`, marginL, pageH - 10)
}

function drawKpi(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, sub: string): void {
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

function drawSectionBanner(ctx: DocContext, num: string, title: string, lead: string): void {
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

function drawH3(ctx: DocContext, title: string): void {
  checkPage(ctx, 10)
  ctx.y += 3
  setText(ctx.doc, FOREST_700, 11, 'bold')
  ctx.doc.text(title, ctx.marginL, ctx.y)
  ctx.y += 5
}

function drawCallout(ctx: DocContext, title: string, text: string, accent: 'forest' | 'gold' = 'gold'): void {
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

// ── Section 01 — Préambule ─────────────────────────────────────────────────

function drawSection01Preambule(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '01 — Préambule',
    'Contexte de la mission',
    "Présentation succincte du client, du déclencheur de l'audit et du cadre normatif applicable.",
  )

  drawH3(ctx, '1.1 Présentation du client')
  writeWrapped(ctx, generateClientPresentation(ctx.data))

  drawH3(ctx, '1.2 Cadre réglementaire et normatif')
  const regs = ctx.data.client?.exigences_reglementaires ?? []
  if (regs.length === 0) {
    writeWrapped(ctx, "Aucune réglementation particulière n'a été renseignée dans le dossier client au moment du cadrage.")
  } else {
    writeWrapped(ctx, `Le client est soumis aux ${regs.length} réglementation(s) suivante(s), identifiées dans son dossier au moment du cadrage :`)
    drawTable(ctx, ['Réglementation', 'Type', 'Impact'], regs.map((r) => [
      r.nom,
      r.type ?? '—',
      (r.impact ?? '—').toUpperCase(),
    ]))
  }

  drawH3(ctx, "1.3 Déclencheur et finalité")
  writeWrapped(ctx, generateMissionPurpose(ctx.data))
  if (ctx.data.mission.audit_objectives) {
    drawCallout(ctx, 'Objectifs énoncés (saisis lors du cadrage)', `« ${ctx.data.mission.audit_objectives} »`, 'gold')
  }
}

// ── Section 02 — Objectifs ─────────────────────────────────────────────────

function drawSection02Objectifs(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '02 — Objectifs',
    'Que cherche-t-on à mesurer ?',
    "Texte libre du cadrage complété par des objectifs structurels générés à partir du framework et des réglementations applicables.",
  )

  drawH3(ctx, 'Objectifs structurels de la mission')
  writeWrapped(ctx, "La mission poursuit quatre objectifs principaux structurés autour du référentiel et des exigences applicables :")

  const objectives = generateStructuralObjectives(ctx.data)
  for (let i = 0; i < objectives.length; i++) {
    drawObjectiveCard(ctx, i + 1, objectives[i].title, objectives[i].description)
  }

  if (ctx.data.mission.audit_criteria) {
    drawH3(ctx, "Critères d'évaluation précisés par le sponsor")
    writeWrapped(ctx, `« ${ctx.data.mission.audit_criteria} »`, { size: 9.5 })
  }
}

function drawObjectiveCard(ctx: DocContext, num: number, title: string, desc: string): void {
  setText(ctx.doc, TEXT_500, 9, 'normal')
  const descLines = ctx.doc.splitTextToSize(desc, ctx.contentW - 22) as string[]
  const h = 12 + descLines.length * 4
  checkPage(ctx, h + 3)
  fillRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, h, 1.5, WHITE)
  strokeRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, h, 1.5, BORDER)
  // Numéro
  ctx.doc.setFillColor(...FOREST_700)
  ctx.doc.circle(ctx.marginL + 7, ctx.y + 7.5, 4, 'F')
  setText(ctx.doc, WHITE, 9, 'bold')
  ctx.doc.text(String(num), ctx.marginL + 7, ctx.y + 8.7, { align: 'center' })
  // Titre
  setText(ctx.doc, TEXT_900, 10, 'bold')
  ctx.doc.text(title, ctx.marginL + 16, ctx.y + 6)
  // Desc
  setText(ctx.doc, TEXT_500, 9, 'normal')
  let ly = ctx.y + 11
  for (const line of descLines) {
    ctx.doc.text(line, ctx.marginL + 16, ly)
    ly += 4
  }
  ctx.y += h + 3
}

// ── Section 03 — Périmètre 4D ──────────────────────────────────────────────

function drawSection03Perimetre(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '03 — Périmètre',
    'Quatre dimensions du périmètre',
    "Périmètre fonctionnel et technique généré depuis les champs IT du dossier client, périmètre temporel depuis les dates de la mission. Détail des inclusions/exclusions issu de mission_exclusions.",
  )

  // 4 cards en grille 2×2
  const cardW = (ctx.contentW - 4) / 2
  const cardH = 38
  const startY = ctx.y
  const fwName = `${ctx.data.mission.framework?.name ?? '—'}${ctx.data.mission.framework?.version ? ' v' + ctx.data.mission.framework.version : ''}`
  drawPerimCard(ctx, ctx.marginL, startY, cardW, cardH, FOREST_700, 'Fonctionnel',
    `Intégralité du SMSI couvert par le référentiel ${fwName}, soit ${ctx.data.domains.length} domaine(s) couvrant la gouvernance et les contrôles applicables.`)
  drawPerimCard(ctx, ctx.marginL + cardW + 4, startY, cardW, cardH, GOLD_500, 'Organisationnel',
    `Évaluation portant sur ${ctx.data.client?.client_name ?? ctx.data.mission.client?.name ?? 'l\'entité cliente'}${ctx.data.client?.effectifs ? ` (${ctx.data.client.effectifs} collaborateurs)` : ''}.`)
  drawPerimCard(ctx, ctx.marginL, startY + cardH + 4, cardW, cardH, BLUE, 'Temporel',
    `Mission conduite du ${formatDate(ctx.data.mission.start_date)} au ${formatDate(ctx.data.mission.end_date)} (${ctx.durationWeeks} semaines).`)
  const techDesc = ctx.data.client?.it_systems && ctx.data.client.it_systems.length > 0
    ? `Systèmes principaux dans le périmètre : ${ctx.data.client.it_systems.slice(0, 5).join(', ')}.`
    : 'Liste détaillée des systèmes à confirmer en début de mission.'
  drawPerimCard(ctx, ctx.marginL + cardW + 4, startY + cardH + 4, cardW, cardH, FOREST_500, 'Technique', techDesc)
  ctx.y = startY + cardH * 2 + 8

  drawH3(ctx, 'Domaines et inclusion par contrôle')
  drawTable(ctx, ['Domaine', 'Libellé', 'Inclus / Total', 'Couverture'],
    ctx.data.domains.map((d) => {
      const total = d.controls.length
      const included = d.controls.filter((c) => !ctx.excludedIds.has(c.id)).length
      const pct = total > 0 ? Math.round((included / total) * 100) : 0
      return [d.code ?? '—', d.name, `${included} / ${total}`, `${pct} %`]
    }),
  )

  if (ctx.data.exclusions.length > 0) {
    drawH3(ctx, 'Exclusions documentées')
    for (const ex of ctx.data.exclusions) {
      const ctrl = ctx.data.domains
        .flatMap((d) => d.controls.map((c) => ({ ...c, domainCode: d.code })))
        .find((c) => c.id === ex.control_id)
      const ctrlLabel = ctrl ? `${ctrl.code ?? ''} ${ctrl.name ?? ''}`.trim() : 'Contrôle'
      drawCallout(ctx, ctrlLabel, `Motif : « ${ex.reason} »`, 'forest')
    }
  }
}

function drawPerimCard(ctx: DocContext, x: number, y: number, w: number, h: number, accent: RGB, title: string, text: string): void {
  fillRoundedRect(ctx.doc, x, y, w, h, 1.5, WHITE)
  strokeRoundedRect(ctx.doc, x, y, w, h, 1.5, BORDER)
  fillRect(ctx.doc, x, y, w, 1.2, accent)
  setText(ctx.doc, TEXT_900, 10, 'bold')
  ctx.doc.text(title, x + 5, y + 8)
  setText(ctx.doc, TEXT_700, 8.5, 'normal')
  const lines = ctx.doc.splitTextToSize(text, w - 10) as string[]
  let ly = y + 14
  for (const line of lines.slice(0, 6)) {
    ctx.doc.text(line, x + 5, ly)
    ly += 3.8
  }
}

// ── Section 04 — Méthodologie ──────────────────────────────────────────────

function drawSection04Methodologie(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '04 — Méthodologie',
    "Approche d'audit basée risques",
    "Méthodologie standardisée du cabinet, identique pour toutes les missions de ce type.",
  )

  writeWrapped(ctx, "La mission s'appuie sur une démarche d'audit basée sur les risques (risk-based approach) conforme aux principes de l'ISO/IEC 27007:2020. Les contrôles sont priorisés par leur exposition au risque résiduel et leur criticité opérationnelle, selon la grille d'analyse standard du cabinet.")

  drawH3(ctx, 'Cinq phases d\'audit')
  const phases = [
    { num: '1', label: 'Cadrage', desc: 'Validation périmètre, équipe, planning.' },
    { num: '2', label: 'Prise de connaissance', desc: 'Questionnaire structuré, collecte documentaire.' },
    { num: '3', label: 'Exécution', desc: 'Entretiens, observations, revues de configuration.' },
    { num: '4', label: 'Synthèse', desc: 'Qualification écarts, plan de remédiation, restitutions.' },
    { num: '5', label: 'Livraison', desc: 'Rapport définitif et transfert du dossier d\'audit.' },
  ]
  for (const p of phases) {
    checkPage(ctx, 10)
    setText(ctx.doc, FOREST_700, 9, 'bold')
    ctx.doc.text(`${p.num}.`, ctx.marginL, ctx.y)
    setText(ctx.doc, TEXT_900, 9, 'bold')
    ctx.doc.text(p.label, ctx.marginL + 6, ctx.y)
    setText(ctx.doc, TEXT_500, 9, 'normal')
    ctx.doc.text(`— ${p.desc}`, ctx.marginL + 6 + ctx.doc.getTextWidth(p.label) + 2, ctx.y)
    ctx.y += 6
  }

  drawH3(ctx, 'Échelle de maturité — niveaux 0 à 5')
  drawTable(ctx, ['Niv.', 'Libellé', 'Critère'], [
    ['0', 'Inexistant', 'Aucun élément observable.'],
    ['1', 'Initial', 'Mise en œuvre informelle, ad hoc.'],
    ['2', 'Reproductible', 'Pratique documentée, application inégale.'],
    ['3', 'Défini', 'Procédure formalisée et déployée.'],
    ['4', 'Maîtrisé', 'Indicateurs mesurés, revues d\'efficacité.'],
    ['5', 'Optimisé', 'Amélioration continue documentée.'],
  ])
}

// ── Section 05 — Risques ───────────────────────────────────────────────────

function drawSection05Risques(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '05 — Risques',
    'Risques initiaux identifiés',
    "Risques saisis lors du cadrage. Les recommandations sont générées automatiquement selon le niveau.",
  )

  if (ctx.data.risks.length === 0) {
    writeWrapped(ctx, "Aucun risque n'a été identifié lors du cadrage.")
    return
  }

  writeWrapped(ctx, `Au stade du cadrage, l'équipe a identifié ${ctx.data.risks.length} risque(s) significatif(s) susceptibles d'affecter la mission ou son exécution.`)

  for (const risk of ctx.data.risks) {
    drawRiskCard(ctx, risk)
  }
}

function drawRiskCard(ctx: DocContext, risk: MissionRisk): void {
  const desc = risk.description ?? '(Pas de description fournie)'
  const mitigation = generateRiskMitigation(risk.risk_level)
  setText(ctx.doc, TEXT_500, 9, 'normal')
  const descLines = ctx.doc.splitTextToSize(desc, ctx.contentW - 10) as string[]
  const mitigLines = ctx.doc.splitTextToSize(mitigation, ctx.contentW - 10) as string[]
  const h = 12 + descLines.length * 4 + 6 + mitigLines.length * 4 + 4
  checkPage(ctx, h + 3)

  const { accent, bg, label } = riskTheme(risk.risk_level)
  fillRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, h, 1.5, WHITE)
  strokeRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, h, 1.5, BORDER)
  fillRect(ctx.doc, ctx.marginL, ctx.y, 1.2, h, accent)

  // Chip + title
  drawChip(ctx, ctx.marginL + 5, ctx.y + 5.5, label, bg, accent)
  setText(ctx.doc, TEXT_900, 10, 'bold')
  ctx.doc.text(risk.title, ctx.marginL + 5 + ctx.doc.getTextWidth(label) + 12, ctx.y + 6)
  // Desc
  setText(ctx.doc, TEXT_500, 9, 'normal')
  let ly = ctx.y + 12
  for (const line of descLines) {
    ctx.doc.text(line, ctx.marginL + 5, ly)
    ly += 4
  }
  // Mitigation block
  ly += 1
  fillRoundedRect(ctx.doc, ctx.marginL + 5, ly, ctx.contentW - 10, 4 + mitigLines.length * 4 + 1, 1, BG)
  setText(ctx.doc, FOREST_700, 7.5, 'bold')
  ctx.doc.text('RECOMMANDATION INITIALE', ctx.marginL + 8, ly + 4)
  setText(ctx.doc, TEXT_700, 8.5, 'normal')
  let mly = ly + 9
  for (const line of mitigLines) {
    ctx.doc.text(line, ctx.marginL + 8, mly)
    mly += 4
  }
  ctx.y += h + 3
}

function drawChip(ctx: DocContext, x: number, y: number, label: string, bg: RGB, fg: RGB): void {
  setText(ctx.doc, fg, 7.5, 'bold')
  const w = ctx.doc.getTextWidth(label) + 5
  fillRoundedRect(ctx.doc, x, y - 3, w, 4.5, 2, bg)
  ctx.doc.text(label, x + 2.5, y)
}

function riskTheme(level: string): { accent: RGB; bg: RGB; label: string } {
  switch (level) {
    case 'critical': return { accent: RED, bg: RED_50, label: 'CRITIQUE' }
    case 'high': return { accent: ORANGE, bg: ORANGE_50, label: 'ÉLEVÉ' }
    case 'medium': return { accent: GOLD_500, bg: GOLD_50, label: 'MOYEN' }
    default: return { accent: FOREST_500, bg: FOREST_50, label: 'FAIBLE' }
  }
}

// ── Section 06 — Équipe + RACI ─────────────────────────────────────────────

function drawSection06Equipe(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '06 — Organisation',
    'Équipe & matrice RACI',
    "Composition de l'équipe extraite des affectations mission. La matrice RACI ci-dessous est un template standard du cabinet.",
  )

  drawH3(ctx, "Équipe d'audit affectée")
  writeWrapped(ctx, `L'équipe est composée de ${ctx.data.members.length} membre(s) couvrant l'ensemble des compétences nécessaires à la mission.`)
  drawTable(ctx, ['Auditeur', 'Rôle', 'Coordonnées'],
    ctx.data.members.map((m) => [
      `${m.user.first_name} ${m.user.last_name}`,
      ctx.roleLabel(m.role),
      [m.user.email, m.user.job_title].filter(Boolean).join(' — ') || '—',
    ]),
  )

  drawH3(ctx, 'Matrice RACI standard')
  writeWrapped(ctx, "Matrice issue du modèle d'organisation du cabinet, applicable par défaut. Toute adaptation est consignée en COPIL.", { size: 9 })
  drawTable(ctx, ['Activité', 'Sponsor', 'Référent tech.', 'Chef miss.', 'Associé'], [
    ['Validation périmètre', 'A', 'C', 'R', 'I'],
    ['Mise à dispo. documentation', 'I', 'R', 'C', 'I'],
    ['Conduite des entretiens', 'I', 'C', 'R', 'I'],
    ['Qualification des écarts', 'I', 'C', 'R', 'A'],
    ['Plan de remédiation', 'I', 'R', 'C', 'I'],
    ['Validation rapport final', 'A', 'C', 'R', 'A'],
  ])
  setText(ctx.doc, TEXT_500, 8, 'normal')
  ctx.y += 2
  ctx.doc.text('R = Réalise · A = Approuve · C = Consulté · I = Informé', ctx.marginL, ctx.y)
  ctx.y += 5
}

// ── Section 07 — Planning ──────────────────────────────────────────────────

function drawSection07Planning(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '07 — Planning',
    `${ctx.durationWeeks} semaines, 5 phases d'audit`,
    "Découpage en 5 phases proportionnelles à la durée de la mission, calculé à partir de start_date et end_date.",
  )

  writeWrapped(ctx, `La mission s'étend du ${formatDate(ctx.data.mission.start_date)} au ${formatDate(ctx.data.mission.end_date)}, soit ${ctx.durationWeeks} semaines. Le découpage standard du cabinet en cinq phases est proportionné à cette durée.`)

  drawH3(ctx, 'Vue Gantt des phases')
  drawGantt(ctx)

  drawH3(ctx, 'Jalons clés (calculés)')
  const milestones = computeMilestones(ctx.data.mission.start_date, ctx.data.mission.end_date)
  drawTable(ctx, ['#', 'Jalon', 'Date estimée'],
    milestones.map((m) => [m.code, m.label, m.date]),
  )

  setText(ctx.doc, TEXT_500, 8.5, 'italic')
  ctx.y += 2
  const note = "Les dates exactes des jalons seront confirmées en première semaine après échange avec le sponsor. Tout glissement supérieur à deux semaines sur le chemin critique fera l'objet d'un avenant."
  const noteLines = ctx.doc.splitTextToSize(note, ctx.contentW) as string[]
  for (const line of noteLines) {
    checkPage(ctx, 4)
    ctx.doc.text(line, ctx.marginL, ctx.y)
    ctx.y += 4
  }
}

function drawGantt(ctx: DocContext): void {
  const phases: { label: string; pctStart: number; pctW: number; color: RGB }[] = [
    { label: '1. Cadrage', pctStart: 0, pctW: 10, color: FOREST_500 },
    { label: '2. Prise de connaissance', pctStart: 10, pctW: 18, color: FOREST_700 },
    { label: '3. Exécution sur terrain', pctStart: 28, pctW: 35, color: FOREST_900 },
    { label: '4. Synthèse', pctStart: 63, pctW: 14, color: FOREST_700 },
    { label: '5. Livraison', pctStart: 77, pctW: 10, color: GOLD_500 },
  ]
  const labelW = 50
  const barW = ctx.contentW - labelW
  const rowH = 6
  const totalH = 8 + phases.length * rowH + 2
  checkPage(ctx, totalH)
  // Header
  fillRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, 7, FOREST_700)
  setText(ctx.doc, WHITE, 7, 'bold')
  ctx.doc.text('PHASE', ctx.marginL + 3, ctx.y + 4.5)
  ctx.doc.text('CHRONOLOGIE', ctx.marginL + labelW + 3, ctx.y + 4.5)
  ctx.y += 8
  // Rows
  for (const p of phases) {
    setText(ctx.doc, TEXT_900, 8.5, 'bold')
    ctx.doc.text(p.label, ctx.marginL + 3, ctx.y + 4)
    // Bar zone background
    fillRect(ctx.doc, ctx.marginL + labelW, ctx.y + 1, barW, rowH - 2, BG)
    // Bar
    const barX = ctx.marginL + labelW + (p.pctStart / 100) * barW
    const barWidth = (p.pctW / 100) * barW
    fillRoundedRect(ctx.doc, barX, ctx.y + 1.5, barWidth, rowH - 3, 0.7, p.color)
    ctx.y += rowH
  }
  ctx.y += 4
}

// ── Section 08 — Livrables + gouvernance ───────────────────────────────────

function drawSection08LivrablesGouvernance(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '08 — Livrables & gouvernance',
    'Ce que vous recevez, comment on travaille',
    "Liste de livrables et instances de pilotage standardisées au niveau cabinet.",
  )

  drawH3(ctx, 'Livrables prévus')
  const endDate = ctx.data.mission.end_date ? formatDate(ctx.data.mission.end_date) : '—'
  drawTable(ctx, ['Livrable', 'Format', 'Date prévue'], [
    ['Note de cadrage signée', 'PDF', '~ Semaine 1'],
    ['Rapport intermédiaire', 'PDF + restitution 90 min', '~ Semaine 6'],
    ['Rapport provisoire', 'PDF + restitution 60 min', '~ Semaine 10'],
    ['Rapport définitif', 'PDF + version éditable', endDate],
    ['Plan de remédiation', 'Tableur + PDF', endDate],
  ])

  drawH3(ctx, 'Instances de pilotage')
  for (const inst of [
    { label: 'COPIL hebdomadaire', desc: 'Vendredi, 45 min. Avancement, levée des points bloquants. Sponsor + référent technique + chef de mission.' },
    { label: 'Stand-up quotidien', desc: '15 min en phase d\'exécution uniquement. Chef de mission + référent technique + auditeur senior.' },
    { label: 'Revues qualité internes', desc: 'Mi-mission et avant restitution finale. Associé en charge selon référentiel cabinet.' },
  ]) {
    setText(ctx.doc, TEXT_900, 9.5, 'bold')
    checkPage(ctx, 10)
    ctx.doc.text(`• ${inst.label}`, ctx.marginL, ctx.y)
    ctx.y += 4.5
    writeWrapped(ctx, inst.desc, { size: 9, indent: 5 })
    ctx.y += 1
  }

  drawH3(ctx, "Règles d'escalade et de communication")
  writeWrapped(ctx, "Tout point bloquant non levé sous 3 jours ouvrés est porté en COPIL. Les désaccords de qualification d'un écart sont arbitrés par l'associé en charge et le sponsor en bilatéral sous 5 jours ouvrés. Les conflits d'intérêts éventuels sont déclarés sans délai au comité d'éthique du cabinet et au sponsor.")
}

// ── Section 09 — Hypothèses + limitations ──────────────────────────────────

function drawSection09Hypotheses(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '09 — Hypothèses & limitations',
    "Ce qui doit être vrai, ce qui ne l'est pas",
    "Hypothèses générées à partir du contexte mission ; limitations standardisées.",
  )

  drawH3(ctx, 'Hypothèses retenues')
  writeWrapped(ctx, "Les hypothèses suivantes conditionnent le bon déroulement de la mission. Elles découlent du contexte client et du référentiel applicable :")
  const hyp = generateHypotheses(ctx.data)
  for (let i = 0; i < hyp.length; i++) {
    checkPage(ctx, 6)
    setText(ctx.doc, FOREST_700, 9, 'bold')
    ctx.doc.text(`H${i + 1}.`, ctx.marginL, ctx.y)
    setText(ctx.doc, TEXT_700, 9, 'normal')
    const lines = ctx.doc.splitTextToSize(hyp[i], ctx.contentW - 8) as string[]
    let ly = ctx.y
    for (const line of lines) {
      checkPage(ctx, 4)
      ctx.doc.text(line, ctx.marginL + 8, ly)
      ly += 4
    }
    ctx.y = ly + 2
  }

  drawH3(ctx, 'Conditions de réussite')
  for (const c of [
    'Engagement formel du sponsor pour la levée rapide des points bloquants en COPIL.',
    'Transparence des équipes opérationnelles dans les entretiens, garantie par la clause de confidentialité du contrat.',
    "Disponibilité d'un référent technique unique côté client sur toute la durée.",
    "Mise à disposition d'un espace de travail pour l'équipe d'audit en phase d'exécution.",
  ]) {
    checkPage(ctx, 5)
    setText(ctx.doc, FOREST_700, 9, 'bold')
    ctx.doc.text('•', ctx.marginL, ctx.y)
    setText(ctx.doc, TEXT_700, 9, 'normal')
    const lines = ctx.doc.splitTextToSize(c, ctx.contentW - 6) as string[]
    let ly = ctx.y
    for (const line of lines) {
      ctx.doc.text(line, ctx.marginL + 4, ly)
      ly += 4
    }
    ctx.y = ly + 1
  }

  drawH3(ctx, 'Limitations')
  drawCallout(
    ctx,
    'Cadre de validité',
    "L'audit n'est pas un audit de certification : il ne donne pas droit à délivrance de certificat. Périmètre limité aux contrôles inclus (cf. section 3). Conclusions à date : toute évolution ultérieure du SMSI n'est pas reflétée.",
    'gold',
  )
}

// ── Section 10 — Signatures ────────────────────────────────────────────────

function drawSection10Signatures(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '10 — Validation',
    'Signatures',
    "Pour bon accord sur le cadrage, le périmètre, le planning et les conditions de la mission.",
  )

  writeWrapped(ctx, "Les soussignés reconnaissent avoir pris connaissance de la présente note de cadrage et des engagements qu'elle décrit, et l'approuvent dans son intégralité.")

  ctx.y += 4
  const cardW = (ctx.contentW - 8) / 3
  const cardH = 50
  const lead = ctx.data.members.find((m) => m.role === 'lead_auditor')
  const associate = ctx.data.members.find((m) => m.role === 'associate')
  drawSignatureCard(ctx, ctx.marginL, ctx.y, cardW, cardH, 'Sponsor client', 'À désigner', 'Représentant habilité du client')
  drawSignatureCard(ctx, ctx.marginL + cardW + 4, ctx.y, cardW, cardH,
    ctx.roleLabel('lead_auditor'),
    lead ? `${lead.user.first_name} ${lead.user.last_name}` : 'À désigner',
    lead?.user.job_title ?? '—',
  )
  drawSignatureCard(ctx, ctx.marginL + (cardW + 4) * 2, ctx.y, cardW, cardH,
    ctx.roleLabel('associate'),
    associate ? `${associate.user.first_name} ${associate.user.last_name}` : 'À désigner',
    associate?.user.job_title ?? '—',
  )
  ctx.y += cardH + 6

  if (ctx.data.mission.scoping_notes) {
    drawCallout(ctx, 'Observations complémentaires', `« ${ctx.data.mission.scoping_notes} »`, 'gold')
  }

  addPageNum(ctx)
}

function drawSignatureCard(ctx: DocContext, x: number, y: number, w: number, h: number, role: string, name: string, fn: string): void {
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

function drawTable(ctx: DocContext, headers: string[], rows: string[][]): void {
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

// ── Prose generators ───────────────────────────────────────────────────────

function generateContextSummary(data: ScopingNoteData): string {
  const fwName = data.mission.framework?.name
  const regs = data.client?.exigences_reglementaires ?? []
  const parts: string[] = []
  if (fwName) parts.push(`Mission de mise en conformité au référentiel ${fwName}.`)
  if (regs.length > 0) parts.push(`Cadre réglementaire : ${regs.slice(0, 2).map((r) => r.nom).join(', ')}.`)
  if (data.client?.client_sector) parts.push(`Secteur ${data.client.client_sector.toLowerCase()}.`)
  return parts.join(' ') || 'Mission d\'évaluation de conformité.'
}

function generateClientPresentation(data: ScopingNoteData): string {
  const c = data.client
  const name = c?.client_name ?? data.mission.client?.name ?? 'Le client'
  const parts: string[] = [`${name} `]
  if (c?.client_sector) parts.push(`exerce une activité dans le secteur ${c.client_sector.toLowerCase()}`)
  if (c?.effectifs) parts.push(`et compte ${c.effectifs} collaborateur(s)`)
  parts.push('. ')
  if (c?.it_systems && c.it_systems.length > 0) {
    parts.push(`Son environnement SI repose sur les systèmes principaux suivants : ${c.it_systems.slice(0, 6).join(', ')}.`)
  }
  if (c?.it_environment) {
    parts.push(` Description de l'environnement IT : « ${c.it_environment} »`)
  }
  return parts.join('')
}

function generateMissionPurpose(data: ScopingNoteData): string {
  const fwName = data.mission.framework?.name
  const fwVer = data.mission.framework?.version ? ` v${data.mission.framework.version}` : ''
  return `La présente mission est conduite dans le cadre d'une démarche de conformité au référentiel ${fwName}${fwVer}. Elle vise à évaluer la conformité du SMSI, identifier les écarts critiques, et formuler un plan de remédiation priorisé. Le périmètre est défini en section 3 et les critères d'évaluation sont précisés ci-après.`
}

function generateStructuralObjectives(data: ScopingNoteData): { title: string; description: string }[] {
  const fwName = data.mission.framework?.name ?? 'le référentiel applicable'
  const fwVer = data.mission.framework?.version ? ` v${data.mission.framework.version}` : ''
  const regs = data.client?.exigences_reglementaires ?? []
  const totalControls = data.domains.reduce((s, d) => s + d.controls.length, 0)
  const excluded = new Set(data.exclusions.map((e) => e.control_id))
  const included = totalControls - excluded.size
  const items: { title: string; description: string }[] = []
  items.push({
    title: `Mesurer la conformité au référentiel ${fwName}${fwVer}`,
    description: `Évaluer chacun des ${included} contrôle(s) inclus dans le périmètre sur l'échelle de maturité du cabinet, avec consolidation par domaine et représentation graphique en radar dans le rapport final.`,
  })
  items.push({
    title: 'Identifier les non-conformités et les qualifier',
    description: 'Tout écart sera classé majeure (compromettant la certification), mineure (ponctuel non systémique) ou observation, selon la grille standard du cabinet.',
  })
  if (regs.length > 0) {
    const regsLabel = regs.slice(0, 3).map((r) => r.nom).join(', ')
    items.push({
      title: 'Vérifier la conformité aux réglementations applicables',
      description: `Cartographier les exigences réglementaires (${regsLabel}) contre les contrôles testés, et qualifier le respect des principes applicables.`,
    })
  }
  items.push({
    title: 'Formuler un plan de remédiation priorisé',
    description: "Tableur exécutoire avec estimation de charge par écart, jalons recommandés, dépendances inter-écarts et identification des responsables internes proposés.",
  })
  return items
}

function generateRiskMitigation(level: string): string {
  switch (level) {
    case 'critical':
      return "Au regard du niveau critique, ce risque doit être traité prioritairement avant le démarrage de la phase d'exécution. Un plan d'action et des responsables doivent être désignés en COPIL hebdomadaire."
    case 'high':
      return "Risque à traiter activement durant la mission. Suivi en COPIL et adaptation du planning pour limiter l'exposition."
    case 'medium':
      return "Risque modéré, à surveiller. Encadrement et mesures préventives recommandés selon le contexte."
    default:
      return "Risque faible, suivi à discrétion en revue de pilotage."
  }
}

function generateHypotheses(data: ScopingNoteData): string[] {
  const fwName = data.mission.framework?.name ?? 'le référentiel applicable'
  const regs = data.client?.exigences_reglementaires ?? []
  const sys = data.client?.it_systems ?? []
  const items: string[] = []
  items.push(`Le client met à disposition de l'équipe d'audit l'ensemble des documents identifiés dans le périmètre du référentiel ${fwName} dans les délais convenus.`)
  items.push("Les ressources internes du client (DSI, RSSI, métiers) sont mobilisées au taux de disponibilité prévu et participent activement aux entretiens planifiés.")
  if (regs.length > 0) {
    items.push(`Aucune évolution réglementaire majeure (${regs.slice(0, 2).map((r) => r.nom).join(', ')}) n'intervient pendant la durée de la mission qui modifierait substantiellement le périmètre.`)
  }
  if (sys.length > 0) {
    items.push(`Les systèmes principaux du périmètre technique (${sys.slice(0, 4).join(', ')}) restent accessibles aux auditeurs en lecture supervisée durant la phase d'exécution.`)
  }
  items.push("Aucun incident de sécurité majeur ne survient pendant la phase d'exécution, qui détournerait les équipes du suivi de la mission.")
  return items
}

function computeMilestones(start: string | null, end: string | null): { code: string; label: string; date: string }[] {
  if (!start || !end) {
    return [
      { code: 'J0', label: 'Validation du cadrage', date: '—' },
      { code: 'J1', label: 'Clôture prise de connaissance', date: '—' },
      { code: 'J2', label: 'Restitution intermédiaire', date: '—' },
      { code: 'J3', label: 'Fin exécution terrain', date: '—' },
      { code: 'J4', label: 'Restitution finale et rapport', date: '—' },
    ]
  }
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const dur = e - s
  const at = (pct: number): string => formatDate(new Date(s + dur * pct).toISOString())
  return [
    { code: 'J0', label: 'Validation du cadrage', date: at(0.10) },
    { code: 'J1', label: 'Clôture prise de connaissance', date: at(0.28) },
    { code: 'J2', label: 'Restitution intermédiaire', date: at(0.60) },
    { code: 'J3', label: 'Fin exécution terrain', date: at(0.82) },
    { code: 'J4', label: 'Restitution finale et rapport', date: formatDate(end) },
  ]
}

function computeDurationWeeks(start: string | null, end: string | null): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24 * 7)))
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// Charge une image distante et la convertit en data URL pour insertion
// jsPDF. Retourne null si l'image n'est pas accessible (CORS, 404) ou
// d'un format non supporté (SVG, etc.). Best effort, ne lève jamais.
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
    if (!format) return null // jsPDF ne supporte pas SVG/GIF nativement

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
    console.warn('[scoping-pdf] logo load failed:', err)
    return null
  }
}
