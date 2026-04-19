import jsPDF from 'jspdf'
import type { InterviewSchedule, ClientContact } from '../../types/database.types'

type RGB = [number, number, number]
const FOREST_900: RGB = [27, 67, 50]
const FOREST_700: RGB = [45, 106, 79]
const FOREST_50: RGB = [240, 255, 244]
const GOLD_500: RGB = [212, 168, 67]
const GOLD_50: RGB = [253, 248, 232]
const TEXT_900: RGB = [26, 26, 26]
const TEXT_700: RGB = [55, 65, 81]
const TEXT_500: RGB = [107, 114, 128]
const TEXT_300: RGB = [156, 163, 175]
const BORDER: RGB = [229, 231, 235]
const WHITE: RGB = [255, 255, 255]
const SUCCESS: RGB = [39, 174, 96]
const WARNING: RGB = [230, 126, 34]

interface CRData {
  interview: InterviewSchedule
  contact: ClientContact | undefined
  auditorName: string
  missionName: string
  rawNotes: string
  controlCodes: string[]
}

export function generateInterviewCRPDF(data: CRData): void {
  const { interview, contact, auditorName, missionName, rawNotes, controlCodes } = data
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const mL = 20
  const mR = 20
  const cW = pageW - mL - mR
  let y = 0

  const sections = parseNotes(rawNotes)
  const dateStr = new Date(interview.scheduled_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = interview.scheduled_time.slice(0, 5)
  const endMin = timeToMin(interview.scheduled_time) + interview.duration_minutes
  const endTime = `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`

  function checkPage(need: number): void {
    if (y + need > pageH - 25) { addFooter(); doc.addPage(); y = 20 }
  }

  function addFooter(): void {
    doc.setFontSize(7.5)
    doc.setTextColor(...TEXT_300)
    doc.text(`G\u00ebstu Comply \u2014 Compte-rendu d'entretien`, mL, pageH - 10)
    doc.text(`Page ${doc.getNumberOfPages()}`, pageW - mR, pageH - 10, { align: 'right' })
    doc.setDrawColor(...BORDER)
    doc.setLineWidth(0.3)
    doc.line(mL, pageH - 14, pageW - mR, pageH - 14)
  }

  // ============================================================
  // PAGE 1 — COUVERTURE
  // ============================================================

  // Bandeau forest
  doc.setFillColor(...FOREST_900)
  doc.rect(0, 0, pageW, 70, 'F')

  // Ligne or
  doc.setFillColor(...GOLD_500)
  doc.rect(0, 70, pageW, 1.5, 'F')

  // Logo
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('G\u00ebstu', mL, 28)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GOLD_500)
  doc.text('COMPLY', mL, 34)

  // Titre
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('Compte-rendu d\u2019entretien', mL, 50)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(255, 255, 255)
  doc.text(interview.title, mL, 60)

  // Carte info
  y = 82

  doc.setFillColor(...WHITE)
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(mL, y, cW, 42, 3, 3, 'FD')

  const infoY = y + 8
  infoField(doc, mL + 8, infoY, 'DATE', dateStr)
  infoField(doc, mL + 8, infoY + 12, 'HORAIRE', `${time} \u2014 ${endTime} (${interview.duration_minutes} min)`)
  infoField(doc, mL + 8, infoY + 24, 'LIEU', interview.location ?? 'Non pr\u00e9cis\u00e9')

  infoField(doc, mL + 90, infoY, 'AUDITEUR', auditorName)
  infoField(doc, mL + 90, infoY + 12, 'INTERLOCUTEUR', contact ? `${contact.name}${contact.job_title ? ` (${contact.job_title})` : ''}` : 'Non pr\u00e9cis\u00e9')
  infoField(doc, mL + 90, infoY + 24, 'MISSION', missionName)

  y = 132

  // Controles couverts
  if (controlCodes.length > 0) {
    doc.setFillColor(...FOREST_50)
    doc.roundedRect(mL, y, cW, 10, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...FOREST_700)
    doc.text(`Contr\u00f4les couverts : ${controlCodes.join(' \u00b7 ')}`, mL + 5, y + 6.5)
    y += 14
  }

  // Confidentialite
  doc.setFillColor(...GOLD_50)
  doc.roundedRect(mL, y, cW, 9, 2, 2, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD_500)
  doc.text('CONFIDENTIEL \u2014 Document de travail d\u2019audit, usage interne uniquement.', mL + 5, y + 6)
  y += 16

  // ============================================================
  // CONTENU STRUCTURE
  // ============================================================

  // --- Objet ---
  sectionHeader(doc, mL, y, cW, 'OBJET DE L\u2019ENTRETIEN')
  y += 12
  para(doc, mL + 2, interview.title, cW - 4)
  y += 8

  // --- Constats principaux ---
  if (sections.findings.length > 0) {
    checkPage(20)
    sectionHeader(doc, mL, y, cW, 'CONSTATS PRINCIPAUX')
    y += 12
    for (const finding of sections.findings) {
      checkPage(10)
      numberedItem(doc, mL, finding, cW)
    }
    y += 4
  }

  // --- Points positifs ---
  if (sections.positives.length > 0) {
    checkPage(16)
    sectionHeader(doc, mL, y, cW, 'POINTS POSITIFS')
    y += 12
    for (const p of sections.positives) {
      checkPage(10)
      iconItem(doc, mL, p, cW, SUCCESS, '\u2713')
    }
    y += 4
  }

  // --- Points d'attention ---
  if (sections.concerns.length > 0) {
    checkPage(16)
    sectionHeader(doc, mL, y, cW, 'POINTS D\u2019ATTENTION')
    y += 12
    for (const c of sections.concerns) {
      checkPage(10)
      iconItem(doc, mL, c, cW, WARNING, '!')
    }
    y += 4
  }

  // --- Actions a suivre ---
  checkPage(16)
  sectionHeader(doc, mL, y, cW, 'ACTIONS \u00c0 SUIVRE')
  y += 12
  if (sections.actions.length > 0) {
    for (let i = 0; i < sections.actions.length; i++) {
      checkPage(10)
      actionItem(doc, mL, i + 1, sections.actions[i], cW)
    }
  } else {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...TEXT_300)
    doc.text('Aucune action identifi\u00e9e \u2014 \u00e0 compl\u00e9ter.', mL + 4, y)
    y += 6
  }
  y += 4

  // --- Documents ---
  if (sections.documents.length > 0) {
    checkPage(16)
    sectionHeader(doc, mL, y, cW, 'DOCUMENTS MENTIONN\u00c9S / \u00c0 COLLECTER')
    y += 12
    for (const d of sections.documents) {
      checkPage(8)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...TEXT_700)
      doc.text(`\u2022 ${d}`, mL + 4, y)
      y += 5.5
    }
    y += 4
  }

  // --- Signature ---
  checkPage(30)
  y += 4
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.line(mL, y, mL + cW, y)
  y += 8

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_500)
  doc.text('SIGNATURES', mL, y)
  y += 8

  // Signature boxes
  const boxW = (cW - 10) / 2
  doc.setDrawColor(...BORDER)
  doc.setLineWidth(0.3)
  doc.roundedRect(mL, y, boxW, 22, 2, 2, 'S')
  doc.roundedRect(mL + boxW + 10, y, boxW, 22, 2, 2, 'S')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_500)
  doc.text('Auditeur', mL + 4, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_900)
  doc.text(auditorName, mL + 4, y + 12)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_500)
  doc.text('Interlocuteur', mL + boxW + 14, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_900)
  doc.text(contact?.name ?? 'N/A', mL + boxW + 14, y + 12)

  // Footer
  addFooter()

  // Pied de page couverture
  doc.setFillColor(...FOREST_900)
  doc.rect(0, pageH - 6, pageW, 6, 'F')

  // Save
  const filename = `CR_${interview.title.replace(/[^a-zA-Z0-9\u00e0-\u00fc]/g, '_').slice(0, 40)}_${interview.scheduled_date}.pdf`
  doc.save(filename)

  // ============================================================
  // INLINE HELPERS (closure over y)
  // ============================================================

  function para(d: jsPDF, x: number, text: string, maxW: number): void {
    d.setFontSize(9)
    d.setFont('helvetica', 'normal')
    d.setTextColor(...TEXT_700)
    const lines = d.splitTextToSize(text, maxW)
    for (const line of lines) {
      checkPage(5)
      d.text(line, x, y)
      y += 4.5
    }
  }

  function numberedItem(d: jsPDF, x: number, text: string, maxW: number): void {
    d.setFillColor(...FOREST_50)
    d.roundedRect(x, y - 3, maxW, 8, 1, 1, 'F')
    d.setFontSize(8.5)
    d.setFont('helvetica', 'normal')
    d.setTextColor(...TEXT_700)
    const lines = d.splitTextToSize(text, maxW - 8)
    d.text(lines[0] ?? '', x + 4, y + 1.5)
    y += 10
  }

  function iconItem(d: jsPDF, x: number, text: string, maxW: number, color: RGB, icon: string): void {
    d.setFillColor(color[0], color[1], color[2])
    d.circle(x + 3, y - 0.5, 2.5, 'F')
    d.setFontSize(7)
    d.setFont('helvetica', 'bold')
    d.setTextColor(...WHITE)
    d.text(icon, x + 1.8, y + 0.5)

    d.setFontSize(8.5)
    d.setFont('helvetica', 'normal')
    d.setTextColor(...TEXT_700)
    const lines = d.splitTextToSize(text, maxW - 12)
    d.text(lines[0] ?? '', x + 9, y + 0.5)
    y += 7
  }

  function actionItem(d: jsPDF, x: number, num: number, text: string, maxW: number): void {
    d.setFillColor(...FOREST_700)
    d.roundedRect(x, y - 3.5, 6, 6, 1, 1, 'F')
    d.setFontSize(7.5)
    d.setFont('helvetica', 'bold')
    d.setTextColor(...WHITE)
    d.text(String(num), x + 2, y)

    d.setFontSize(8.5)
    d.setFont('helvetica', 'normal')
    d.setTextColor(...TEXT_700)
    const lines = d.splitTextToSize(text, maxW - 12)
    d.text(lines[0] ?? '', x + 9, y)
    y += 8
  }
}

// ============================================================
// STATIC HELPERS
// ============================================================

function sectionHeader(doc: jsPDF, x: number, y: number, w: number, title: string): void {
  doc.setFillColor(27, 67, 50)
  doc.roundedRect(x, y, w, 8, 1.5, 1.5, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(title, x + 5, y + 5.5)
}

function infoField(doc: jsPDF, x: number, y: number, label: string, value: string): void {
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(107, 114, 128)
  doc.text(label, x, y)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(26, 26, 26)
  doc.text(value.slice(0, 40), x, y + 5)
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Notes parser (same logic as interviewHelpers but returns arrays)
interface Sections { findings: string[]; positives: string[]; concerns: string[]; actions: string[]; documents: string[] }

function parseNotes(raw: string): Sections {
  const findings: string[] = []
  const positives: string[] = []
  const concerns: string[] = []
  const actions: string[] = []
  const documents: string[] = []

  const sentences = raw.split(/[.\n]/).map((s) => s.trim()).filter((s) => s.length > 10)

  for (const s of sentences) {
    const l = s.toLowerCase()
    if (has(l, ['document', 'rapport', 'politique', 'charte', 'registre', 'inventaire', 'plan', 'matrice']) && has(l, ['fournir', 'transmettre', 'envoyer', 'manque', 'absent', 'demander', 'collecter'])) { documents.push(cap(s)); continue }
    if (has(l, ['il faut', 'doit', 'devrait', 'pr\u00e9voir', 'planifier', '\u00e0 faire', 'action', 'mettre en place', 'am\u00e9liorer', 'corriger', 'compl\u00e9ter'])) { actions.push(cap(s)); continue }
    if (has(l, ['risque', 'probl\u00e8me', 'manque', 'absent', 'insuffisant', 'non conforme', 'pas de', 'aucun', 'retard', 'incomplet', 'critique', 'attention'])) { concerns.push(cap(s)); continue }
    if (has(l, ['conforme', 'en place', 'formalis\u00e9', 'document\u00e9', 'r\u00e9gulier', 'efficace', 'valid\u00e9', 'approuv\u00e9', 'satisfaisant', 'complet', 'test\u00e9'])) { positives.push(cap(s)); continue }
    findings.push(cap(s))
  }

  return { findings, positives, concerns, actions, documents }
}

function has(t: string, kw: string[]): boolean { return kw.some((k) => t.includes(k)) }
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }
