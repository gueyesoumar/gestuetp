import jsPDF from 'jspdf'
import type { MissionDetail, MissionMemberRow } from '../missions/useMissionDetail'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'
import type { MissionExclusion, MissionRisk, CabinetClient } from '../../types/database.types'
import { ROLE_LABELS } from '../missions/mission-constants'

interface ScopingNoteData {
  mission: MissionDetail
  members: MissionMemberRow[]
  domains: DomainWithControls[]
  exclusions: MissionExclusion[]
  risks: MissionRisk[]
  client: CabinetClient | null
  questionnaireProgress: number
  documentsReceived: number
  documentsExpected: number
}

// Couleurs Gestu — mutable arrays pour compatibilite jsPDF spread
type RGB = [number, number, number]
const FOREST_900: RGB = [27, 67, 50]
const FOREST_700: RGB = [45, 106, 79]
const FOREST_50: RGB = [240, 255, 244]
const GOLD_500: RGB = [212, 168, 67]
const GOLD_50: RGB = [253, 248, 232]
const ERROR_RED: RGB = [192, 57, 43]
const TEXT_900: RGB = [26, 26, 26]
const TEXT_700: RGB = [55, 65, 81]
const TEXT_500: RGB = [107, 114, 128]
const TEXT_300: RGB = [156, 163, 175]
const BORDER: RGB = [229, 231, 235]
const WHITE: RGB = [255, 255, 255]
const BG: RGB = [250, 250, 248]

export function generateScopingNotePDF(data: ScopingNoteData): void {
  const { mission, members, domains, exclusions, risks, client, questionnaireProgress, documentsReceived, documentsExpected } = data

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const marginL = 20
  const marginR = 20
  const contentW = pageW - marginL - marginR
  let y = 0

  const excludedIds = new Set(exclusions.map((e) => e.control_id))
  const totalControls = domains.reduce((s, d) => s + d.controls.length, 0)
  const includedControls = totalControls - excludedIds.size

  // === HELPERS ===

  function checkPage(needed: number): void {
    if (y + needed > pageH - 25) {
      addFooter()
      doc.addPage()
      y = 20
    }
  }

  function addFooter(): void {
    const pageNum = doc.getNumberOfPages()
    doc.setFontSize(8)
    doc.setTextColor(...TEXT_300)
    doc.text(`G\u00ebstu Comply \u2014 Note de cadrage \u2014 ${mission.name}`, marginL, pageH - 10)
    doc.text(`Page ${pageNum}`, pageW - marginR, pageH - 10, { align: 'right' })
    // Ligne fine en bas
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.line(marginL, pageH - 14, pageW - marginR, pageH - 14)
  }

  function sectionTitle(title: string, icon?: string): void {
    checkPage(14)
    y += 4
    doc.setFillColor(...FOREST_900)
    doc.roundedRect(marginL, y, contentW, 9, 1.5, 1.5, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text(`${icon ? icon + '  ' : ''}${title}`, marginL + 5, y + 6.2)
    y += 13
  }

  function subsectionTitle(title: string): void {
    checkPage(10)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...FOREST_700)
    doc.text(title, marginL, y)
    y += 1
    doc.setDrawColor(...FOREST_700)
    doc.setLineWidth(0.4)
    doc.line(marginL, y, marginL + doc.getTextWidth(title), y)
    y += 5
  }

  function paragraph(text: string, indent: number = 0): void {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_700)
    const lines = doc.splitTextToSize(text, contentW - indent - 4)
    for (const line of lines) {
      checkPage(5)
      doc.text(line, marginL + indent + 2, y)
      y += 4.2
    }
  }

  function chip(x: number, yPos: number, label: string, bgColor: RGB, textColor: RGB): number {
    doc.setFontSize(7)
    const w = doc.getTextWidth(label) + 6
    doc.setFillColor(...bgColor)
    doc.roundedRect(x, yPos - 3, w, 5, 1.2, 1.2, 'F')
    doc.setTextColor(...textColor)
    doc.setFont('helvetica', 'bold')
    doc.text(label, x + 3, yPos)
    return w + 2
  }

  // === PAGE 1 : COUVERTURE ===

  // Bandeau superieur forest
  doc.setFillColor(...FOREST_900)
  doc.rect(0, 0, pageW, 85, 'F')

  // Ligne or decorative
  doc.setFillColor(...GOLD_500)
  doc.rect(0, 85, pageW, 2, 'F')

  // Logo / Titre
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('G\u00ebstu', marginL, 35)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(212, 168, 67) // gold
  doc.text('COMPLY', marginL, 42)

  // Titre du document
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('Note de Cadrage', marginL, 60)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(255, 255, 255, 0.7)
  doc.text(mission.name, marginL, 70)

  // Metadonnees sous le bandeau
  y = 100

  // Carte resume
  doc.setFillColor(...WHITE)
  doc.roundedRect(marginL, y, contentW, 50, 3, 3, 'F')
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(marginL, y, contentW, 50, 3, 3, 'S')

  const cardY = y + 8
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_500)
  doc.text('CLIENT', marginL + 8, cardY)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_900)
  doc.text(client?.client_name ?? mission.client?.name ?? '\u2014', marginL + 8, cardY + 6)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_500)
  doc.text('R\u00c9F\u00c9RENTIEL', marginL + 8, cardY + 16)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_900)
  doc.text(`${mission.framework?.name ?? ''} ${mission.framework?.version ? `v${mission.framework.version}` : ''}`, marginL + 8, cardY + 22)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_500)
  doc.text('P\u00c9RIODE', marginL + 100, cardY)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_900)
  doc.text(`${formatDate(mission.start_date)} \u2192 ${formatDate(mission.end_date)}`, marginL + 100, cardY + 6)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_500)
  doc.text('P\u00c9RIM\u00c8TRE', marginL + 100, cardY + 16)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_900)
  doc.text(`${includedControls} contr\u00f4les \u00b7 ${domains.length} domaines`, marginL + 100, cardY + 22)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_500)
  doc.text('\u00c9QUIPE', marginL + 100, cardY + 32)
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_900)
  doc.text(`${members.length} membres`, marginL + 100, cardY + 38)

  // Date de generation
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_500)
  doc.text('DATE', marginL + 8, cardY + 32)
  doc.setFontSize(10)
  doc.setTextColor(...TEXT_900)
  doc.text(new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }), marginL + 8, cardY + 38)

  // Confidentialite
  y = 170
  doc.setFillColor(...GOLD_50)
  doc.roundedRect(marginL, y, contentW, 12, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD_500)
  doc.text('CONFIDENTIEL \u2014 Ce document est destin\u00e9 aux parties prenantes de la mission uniquement.', marginL + 5, y + 7.5)

  // Pied de page couverture
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_300)
  doc.text('Document g\u00e9n\u00e9r\u00e9 automatiquement par G\u00ebstu Comply', marginL, pageH - 15)
  doc.setFillColor(...FOREST_900)
  doc.rect(0, pageH - 8, pageW, 8, 'F')

  // === PAGE 2+ : CONTENU ===
  doc.addPage()
  y = 20

  // --- 1. EQUIPE ---
  sectionTitle('1. \u00c9quipe de mission')

  // Table header
  doc.setFillColor(...BG)
  doc.rect(marginL, y, contentW, 7, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_500)
  doc.text('NOM', marginL + 4, y + 5)
  doc.text('R\u00d4LE', marginL + 70, y + 5)
  doc.text('FONCTION', marginL + 110, y + 5)
  y += 8

  for (const m of members) {
    checkPage(7)
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.2)
    doc.line(marginL, y + 5.5, marginL + contentW, y + 5.5)
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_900)
    doc.text(`${m.user.first_name} ${m.user.last_name}`, marginL + 4, y + 4)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_700)
    doc.text(ROLE_LABELS[m.role] ?? m.role, marginL + 70, y + 4)
    doc.setTextColor(...TEXT_500)
    doc.text(m.user.job_title ?? '\u2014', marginL + 110, y + 4)
    y += 6.5
  }
  y += 6

  // --- 2. OBJECTIFS ---
  sectionTitle('2. Objectifs de la mission')

  const objectives = buildObjectives(mission, client)
  for (const obj of objectives) {
    checkPage(18)
    doc.setFillColor(...FOREST_50)
    doc.roundedRect(marginL, y, contentW, 14, 1.5, 1.5, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...FOREST_700)
    doc.text(`\u2022 ${obj.title}`, marginL + 4, y + 5.5)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...TEXT_500)
    const descLines = doc.splitTextToSize(obj.description, contentW - 10)
    doc.text(descLines[0] ?? '', marginL + 4, y + 10.5)
    y += 16
  }
  y += 4

  // --- 3. PERIMETRE ---
  sectionTitle('3. P\u00e9rim\u00e8tre d\u2019audit')

  subsectionTitle('3.1 Domaines et contr\u00f4les inclus')

  for (const domain of domains) {
    const included = domain.controls.filter((c) => !excludedIds.has(c.id))
    const excluded = domain.controls.filter((c) => excludedIds.has(c.id))

    checkPage(10)
    doc.setFillColor(...BG)
    doc.roundedRect(marginL, y, contentW, 7, 1, 1, 'F')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...FOREST_700)
    doc.text(`${domain.code}  ${domain.name}`, marginL + 4, y + 5)
    doc.setTextColor(...TEXT_500)
    doc.setFont('helvetica', 'normal')
    doc.text(`${included.length}/${domain.controls.length} contr\u00f4les`, marginL + contentW - 35, y + 5)
    y += 9

    if (excluded.length > 0) {
      for (const ex of excluded) {
        checkPage(7)
        const reason = exclusions.find((e) => e.control_id === ex.id)?.reason ?? ''
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...ERROR_RED)
        doc.text(`  \u2717 ${ex.code} ${ex.name}`, marginL + 6, y)
        doc.setTextColor(...TEXT_300)
        doc.text(`\u2014 ${reason}`, marginL + 80, y)
        y += 5
      }
    }
    y += 2
  }
  y += 4

  // --- 4. REGLEMENTATIONS ---
  if (client && client.exigences_reglementaires.length > 0) {
    sectionTitle('4. R\u00e9glementations applicables')

    // Table
    doc.setFillColor(...BG)
    doc.rect(marginL, y, contentW, 7, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...TEXT_500)
    doc.text('R\u00c9GLEMENTATION', marginL + 4, y + 5)
    doc.text('TYPE', marginL + 100, y + 5)
    doc.text('IMPACT', marginL + 130, y + 5)
    y += 8

    for (const reg of client.exigences_reglementaires) {
      checkPage(7)
      doc.setDrawColor(...BORDER)
      doc.setLineWidth(0.2)
      doc.line(marginL, y + 5.5, marginL + contentW, y + 5.5)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...TEXT_900)
      doc.text(reg.nom, marginL + 4, y + 4)
      doc.setTextColor(...TEXT_500)
      doc.text(reg.type ?? '', marginL + 100, y + 4)

      const impactColor = reg.impact === 'fort' ? ERROR_RED : reg.impact === 'moyen' ? GOLD_500 : TEXT_300
      doc.setTextColor(...impactColor)
      doc.setFont('helvetica', 'bold')
      doc.text((reg.impact ?? '').toUpperCase(), marginL + 130, y + 4)
      y += 6.5
    }
    y += 6
  }

  // --- 5. RISQUES ---
  const riskSection = client?.exigences_reglementaires.length ? '5' : '4'
  sectionTitle(`${riskSection}. Risques initiaux identifi\u00e9s`)

  if (risks.length === 0) {
    paragraph('Aucun risque identifi\u00e9 lors du cadrage.')
  } else {
    for (const risk of risks) {
      checkPage(20)
      const riskColor: RGB = risk.risk_level === 'critical' ? ERROR_RED : risk.risk_level === 'high' ? [230, 126, 34] : GOLD_500

      doc.setFillColor(...WHITE)
      doc.setDrawColor(...BORDER)
      doc.roundedRect(marginL, y, contentW, 16, 1.5, 1.5, 'FD')

      // Risk level chip
      const levelLabel = risk.risk_level === 'critical' ? 'CRITIQUE' : risk.risk_level === 'high' ? '\u00c9LEV\u00c9' : risk.risk_level === 'medium' ? 'MOYEN' : 'FAIBLE'
      const chipBg: RGB = risk.risk_level === 'critical' ? [253, 232, 232] : risk.risk_level === 'high' ? [255, 243, 224] : [253, 248, 232]
      chip(marginL + 4, y + 5, levelLabel, chipBg, riskColor)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...TEXT_900)
      doc.text(risk.title, marginL + 30, y + 5.5)

      if (risk.description) {
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...TEXT_500)
        const descLines = doc.splitTextToSize(risk.description, contentW - 10)
        doc.text(descLines[0] ?? '', marginL + 4, y + 12)
      }

      y += 18
    }
  }
  y += 4

  // --- 6. AVANCEMENT ---
  const advSection = parseInt(riskSection) + 1
  sectionTitle(`${advSection}. Avancement du cadrage`)

  // Progress cards
  checkPage(22)
  const cardW = (contentW - 8) / 3

  drawProgressCard(doc, marginL, y, cardW, 'Questionnaire', `${questionnaireProgress}%`, questionnaireProgress, FOREST_700)
  drawProgressCard(doc, marginL + cardW + 4, y, cardW, 'Documents', `${documentsReceived}/${documentsExpected}`, documentsExpected > 0 ? (documentsReceived / documentsExpected) * 100 : 0, GOLD_500)
  drawProgressCard(doc, marginL + (cardW + 4) * 2, y, cardW, 'Risques', `${risks.length} identifi\u00e9s`, risks.length > 0 ? 100 : 0, FOREST_700)

  y += 28

  // Footer derniere page
  addFooter()

  // Telecharger
  const filename = `Note_cadrage_${mission.name.replace(/[^a-zA-Z0-9\u00e0-\u00fc]/g, '_')}.pdf`
  doc.save(filename)
}

// === HELPERS ===

function drawProgressCard(doc: jsPDF, x: number, y: number, w: number, label: string, value: string, pct: number, color: RGB): void {
  doc.setFillColor(...WHITE)
  doc.setDrawColor(...BORDER)
  doc.roundedRect(x, y, w, 20, 2, 2, 'FD')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_500)
  doc.text(label.toUpperCase(), x + 4, y + 6)

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...color)
  doc.text(value, x + 4, y + 14)

  // Mini progress bar
  doc.setFillColor(...BORDER)
  doc.roundedRect(x + 4, y + 16.5, w - 8, 1.5, 0.5, 0.5, 'F')
  if (pct > 0) {
    doc.setFillColor(...color)
    doc.roundedRect(x + 4, y + 16.5, Math.max(1, (w - 8) * (pct / 100)), 1.5, 0.5, 0.5, 'F')
  }
}

function formatDate(date: string | null): string {
  if (!date) return '\u2014'
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildObjectives(mission: MissionDetail, client: CabinetClient | null): { title: string; description: string }[] {
  const fw = mission.framework
  const regs = client?.exigences_reglementaires ?? []
  const items: { title: string; description: string }[] = []

  if (fw) {
    items.push({
      title: `\u00c9valuer la conformit\u00e9 du SMSI`,
      description: `Mesurer le niveau de conformit\u00e9 par rapport aux exigences ${fw.name}${fw.version ? ` v${fw.version}` : ''}.`,
    })
  }

  items.push({
    title: 'Identifier les \u00e9carts et non-conformit\u00e9s',
    description: 'D\u00e9tecter les \u00e9carts critiques avec priorisation par niveau de risque.',
  })

  if (regs.length > 0) {
    const regNames = regs.slice(0, 3).map((r) => r.nom).join(', ')
    items.push({
      title: 'V\u00e9rifier la conformit\u00e9 r\u00e9glementaire',
      description: `S\u2019assurer du respect de ${regNames}.`,
    })
  }

  items.push({
    title: 'Formuler un plan de rem\u00e9diation',
    description: 'Proposer des recommandations concr\u00e8tes et un plan d\u2019action prioris\u00e9.',
  })

  return items
}
