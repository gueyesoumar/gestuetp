import type jsPDF from 'jspdf'
import {
  type RGB, BLUE, BORDER, CREAM, FOREST_700, FOREST_900, GOLD_500, GREEN,
  ORANGE, RED, TEXT_500, TEXT_700, TEXT_900, WHITE,
} from './colors'
import type { AssessmentWithControl, DocContext, DomainStat } from './context'
import { drawPriorityMatrix, drawRadarChart } from './charts'
import type { LogoData } from './logo-loader'
import { checkPage, setPageContext } from './page-chrome'
import {
  drawH3, drawKpi, drawSectionBanner, drawTable, fillRect, fillRounded,
  setText, strokeRounded, writeParagraphs, writeWrapped,
} from './primitives'
import { memberName, statusLabel, truncate } from './utils'
import {
  clientLabel, describeVerdict, generateActionPlanNarrative, generateConclusionNarrative,
  generateContextNarrative, generateDomainNarrative, generateExecutiveNarrative,
  generateMethodologyNarrative, generateNCFactSheet, generateRecommendationNarrative,
} from '../auditReportNarratives'

// ── Section 01 — Contexte ─────────────────────────────────────────────────

export function drawSection01Context(ctx: DocContext): void {
  drawSectionBanner(ctx, '01', 'Contexte et mandat', 'Cadre de la mission, périmètre, équipe et destinataires du rapport')
  writeParagraphs(ctx, generateContextNarrative(ctx.data), { gap: 4 })
}

// ── Section 02 — Méthodologie ─────────────────────────────────────────────

export function drawSection02Methodology(ctx: DocContext): void {
  drawSectionBanner(ctx, '02', 'Méthodologie d’audit', "Standards mobilisés, techniques d'audit, échantillonnage et matérialité")
  writeParagraphs(ctx, generateMethodologyNarrative(ctx.data), { gap: 4 })
}

// ── Section 03 — Synthèse exécutive ───────────────────────────────────────

export function drawSection03ExecutiveSummary(ctx: DocContext): void {
  drawSectionBanner(ctx, '03', 'Synthèse exécutive', "Score de conformité, verdict, lecture rapide, radar de maturité")

  const { doc, marginL, contentW, data } = ctx
  const t = data.totals
  const v = describeVerdict(t.conformityScore, t.ncMajor)

  // Bloc score / verdict (grand chiffre + bandeau)
  const blockH = 46
  fillRounded(doc, marginL, ctx.y, contentW, blockH, 3, ctx.palette.primary)
  fillRect(doc, marginL, ctx.y, 4, blockH, ctx.palette.accent)
  setText(doc, [200, 220, 210], 8, 'bold')
  doc.text('SCORE DE CONFORMITÉ', marginL + 10, ctx.y + 9)
  setText(doc, ctx.palette.accent, 42, 'bold')
  doc.text(`${t.conformityScore}%`, marginL + 10, ctx.y + 32)
  setText(doc, [200, 220, 210], 7.5, 'normal')
  doc.text('Pondération ISO · détail en Annexe A', marginL + 10, ctx.y + 39)
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

export function drawSection04DomainDetails(ctx: DocContext): void {
  drawSectionBanner(ctx, '04', 'Détail par domaine', 'Score, maturité, faits saillants et statistiques de couverture')
  for (const d of ctx.data.domainStats) {
    drawDomainBlock(ctx, d)
  }
}

function drawDomainBlock(ctx: DocContext, d: DomainStat): void {
  checkPage(ctx, 70)
  const { doc, marginL, contentW } = ctx
  // En-tête domaine
  fillRounded(doc, marginL, ctx.y, contentW, 16, 2, ctx.palette.primaryLight)
  fillRect(doc, marginL, ctx.y, 4, 16, ctx.palette.accent)
  setText(doc, FOREST_900, 12, 'bold')
  doc.text(`${d.code} — ${d.name}`, marginL + 8, ctx.y + 10)
  // Score badge
  const sx = marginL + contentW - 26
  const sc = d.score >= 80 ? GREEN : d.score >= 60 ? GOLD_500 : RED
  fillRounded(doc, sx, ctx.y + 3, 22, 10, 2, sc)
  setText(doc, WHITE, 10, 'bold')
  doc.text(`${d.score}%`, sx + 11, ctx.y + 10, { align: 'center' })
  ctx.y += 18

  // Stats inline — alignées avec le titre du bandeau au-dessus (marginL + 8)
  setText(doc, TEXT_500, 8.5, 'normal')
  doc.text(`${d.scored}/${d.total} contrôles évalués · ${d.conformes} strictement conformes · ${d.ncMajor} NC maj · ${d.ncMinor} NC min · ${d.observations} obs.`, marginL + 8, ctx.y)
  ctx.y += 6

  // Narratif
  writeParagraphs(ctx, generateDomainNarrative(d, ctx.data), { gap: 2.5 })

  // Description du domaine si dispo
  if (d.description?.trim()) {
    writeWrapped(ctx, `Périmètre couvert : ${d.description.trim()}`, { size: 9, color: TEXT_500, lineHeight: 4.6, weight: 'normal' })
  }
  ctx.y += 5
}

// ── Section 05 — Fiches NC majeures ───────────────────────────────────────

export function drawSection05NCFactSheets(ctx: DocContext): void {
  const majors = ctx.data.assessments.filter((a) => a.finding_classification === 'major_nc')
  if (majors.length === 0) {
    drawSectionBanner(ctx, '05', 'Fiches de non-conformités majeures', 'Aucune NC majeure caractérisée — synthèse')
    writeParagraphs(ctx, [
      `Au terme de l'audit, aucune non-conformité majeure n'a été caractérisée. L'organisation présente, sur l'intégralité du périmètre couvert, un dispositif de contrôle interne dont les éventuels écarts résiduels relèvent de non-conformités mineures ou d'observations dont le détail figure en section 4.`,
    ], { gap: 4 })
    return
  }

  // Première fiche : on garde la même page que le banner pour ne pas
  // laisser une page vide après l'en-tête de section.
  drawSectionBanner(ctx, '05', 'Fiches de non-conformités majeures', 'Exigence, constat, preuves, cause racine, impact, recommandation')
  let i = 1
  for (const a of majors) {
    drawNCFactSheet(ctx, a, i, majors.length, i === 1)
    i++
  }
}

function drawNCFactSheet(ctx: DocContext, a: AssessmentWithControl, idx: number, total: number, sameAsBanner = false): void {
  // 1 fiche = 1 page idéalement. Si sameAsBanner, on enchaîne sur la
  // page courante (qui contient déjà le banner section).
  if (!sameAsBanner) {
    ctx.doc.addPage()
    ctx.y = 22
  }
  setPageContext(ctx, `05 Fiches NC majeures (${idx}/${total})`)

  const { doc, marginL, contentW } = ctx
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

// ── Section 06 — Recommandations + matrice ────────────────────────────────

export function drawSection06Recommendations(ctx: DocContext): void {
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

  // Indent gauche du corps : aligné sous le titre (badge + chip = 32 mm)
  const BODY_X = 32
  const text = a.recommendations ?? '—'
  const lines = doc.splitTextToSize(text, contentW - BODY_X - 4) as string[]
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
  doc.text(`${a.control.code} — ${truncate(a.control.name, 55)}`, marginL + BODY_X, ctx.y + 8)

  setText(doc, TEXT_700, 9, 'normal')
  let ly = ctx.y + 14
  for (const l of lines) { doc.text(l, marginL + BODY_X, ly); ly += 4.5 }

  ctx.y += cardH + 2
}

// ── Section 07 — Plan d'action ────────────────────────────────────────────

export function drawSection07ActionPlan(ctx: DocContext): void {
  drawSectionBanner(ctx, '07', 'Plan d’action de remédiation', "Cycle de vie des CAR, suivi sur la plateforme et tableau récapitulatif")
  writeParagraphs(ctx, generateActionPlanNarrative(ctx.data), { gap: 4 })

  const items = ctx.data.assessments.filter((a) => a.finding_classification === 'major_nc' || a.finding_classification === 'minor_nc' || a.finding_classification === 'observation')
  if (items.length === 0) {
    writeWrapped(ctx, 'Aucune action à inscrire au plan : la mission ne présente pas de non-conformité ni d’observation.', { color: TEXT_500 })
    return
  }
  drawH3(ctx, `Récapitulatif (${items.length} CAR)`)
  // Tri : NC maj > NC min > obs, puis par code de contrôle
  const order = (a: AssessmentWithControl): number => a.finding_classification === 'major_nc' ? 0 : a.finding_classification === 'minor_nc' ? 1 : 2
  const sorted = [...items].sort((a, b) => order(a) - order(b) || a.control.code.localeCompare(b.control.code))
  drawTable(ctx,
    ['Réf.', 'Type', 'Contrôle', 'Constat (extrait)'],
    sorted.slice(0, 40).map((a) => [
      a.control.code,
      a.finding_classification === 'major_nc' ? 'NC maj' : a.finding_classification === 'minor_nc' ? 'NC min' : 'Obs.',
      truncate(a.control.name, 38),
      truncate(a.findings ?? '—', 60),
    ]),
    [22, 18, 60, 74],
  )
  if (items.length > 40) {
    writeWrapped(ctx, `(${items.length - 40} actions supplémentaires accessibles via l'export Excel du plan d'action.)`, { color: TEXT_500, size: 8.5 })
  }
}

// ── Section 08 — Conclusion + signataires ─────────────────────────────────

export function drawSection08Conclusion(ctx: DocContext, _clientLogo: LogoData | null): void {
  drawSectionBanner(ctx, '08', 'Conclusion et opinion d’audit', 'Verdict argumenté, conditions de délivrance et signatures')

  writeParagraphs(ctx, generateConclusionNarrative(ctx.data), { gap: 4 })

  // Encadré verdict
  const v = describeVerdict(ctx.data.totals.conformityScore, ctx.data.totals.ncMajor)
  checkPage(ctx, 28)
  const { doc, marginL, contentW } = ctx
  fillRounded(doc, marginL, ctx.y, contentW, 22, 2.4, ctx.palette.primary)
  fillRect(doc, marginL, ctx.y, 4, 22, ctx.palette.accent)
  setText(doc, [200, 220, 210], 8, 'bold')
  doc.text('OPINION D’AUDIT FORMELLE', marginL + 10, ctx.y + 8)
  setText(doc, GOLD_500, 16, 'bold')
  doc.text(v.label, marginL + 10, ctx.y + 17)
  ctx.y += 28

  // Signatures
  drawH3(ctx, 'Signatures')
  const lead = ctx.data.members.find((m) => m.role === 'lead_auditor')
  const associate = ctx.data.members.find((m) => m.role === 'associate')
  const primaryClient = ctx.data.clientContacts[0] ?? null
  const cardW = (contentW - 8) / 3, cardH = 38
  // Si pas d'associé en équipe, on remplace cette case par le chef de mission
  // pour ne pas avoir une case vide.
  if (associate) {
    drawSignatureCard(doc, marginL + 0 * (cardW + 4), ctx.y, cardW, cardH, 'Associé signataire', memberName(associate), ctx.data.cabinetName)
    drawSignatureCard(doc, marginL + 1 * (cardW + 4), ctx.y, cardW, cardH, 'Chef de mission', lead ? memberName(lead) : '—', ctx.data.cabinetName)
  } else {
    drawSignatureCard(doc, marginL + 0 * (cardW + 4), ctx.y, cardW, cardH, 'Chef de mission', lead ? memberName(lead) : '—', ctx.data.cabinetName)
    drawSignatureCard(doc, marginL + 1 * (cardW + 4), ctx.y, cardW, cardH, 'Cabinet d’audit', '—', ctx.data.cabinetName)
  }
  drawSignatureCard(doc, marginL + 2 * (cardW + 4), ctx.y, cardW, cardH,
    'Pour l’entité auditée',
    primaryClient ? primaryClient.contact_name : '—',
    primaryClient ? `${primaryClient.job_title ?? 'Contact'} · ${clientLabel(ctx.data)}` : clientLabel(ctx.data))
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
