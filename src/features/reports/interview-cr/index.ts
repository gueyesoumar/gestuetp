import jsPDF from 'jspdf'
import type { InterviewSchedule, ClientContact } from '../../../types/database.types'
import {
  type RGB, BORDER, FOREST_50, FOREST_700, FOREST_900, GOLD_50, GOLD_500,
  SUCCESS, TEXT_300, TEXT_500, TEXT_700, TEXT_900, WARNING, WHITE,
} from './colors'
import { parseNotes } from './parse-notes'
import { infoField, sectionHeader, timeToMin } from './static-helpers'

export interface CRData {
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
    doc.text(`Gëstu Comply — Compte-rendu d'entretien`, mL, pageH - 10)
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
  doc.text('Gëstu', mL, 28)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GOLD_500)
  doc.text('COMPLY', mL, 34)

  // Titre
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...WHITE)
  doc.text('Compte-rendu d’entretien', mL, 50)

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
  infoField(doc, mL + 8, infoY + 12, 'HORAIRE', `${time} — ${endTime} (${interview.duration_minutes} min)`)
  infoField(doc, mL + 8, infoY + 24, 'LIEU', interview.location ?? 'Non précisé')

  infoField(doc, mL + 90, infoY, 'AUDITEUR', auditorName)
  infoField(doc, mL + 90, infoY + 12, 'INTERLOCUTEUR', contact ? `${contact.name}${contact.job_title ? ` (${contact.job_title})` : ''}` : 'Non précisé')
  infoField(doc, mL + 90, infoY + 24, 'MISSION', missionName)

  y = 132

  // Controles couverts
  if (controlCodes.length > 0) {
    doc.setFillColor(...FOREST_50)
    doc.roundedRect(mL, y, cW, 10, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...FOREST_700)
    doc.text(`Sujets couverts : ${controlCodes.join(' · ')}`, mL + 5, y + 6.5)
    y += 14
  }

  // Confidentialite
  doc.setFillColor(...GOLD_50)
  doc.roundedRect(mL, y, cW, 9, 2, 2, 'F')
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GOLD_500)
  doc.text('CONFIDENTIEL — Document de travail d’audit, usage interne uniquement.', mL + 5, y + 6)
  y += 16

  // ============================================================
  // CONTENU STRUCTURE
  // ============================================================

  // --- Objet ---
  sectionHeader(doc, mL, y, cW, 'OBJET DE L’ENTRETIEN')
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
      iconItem(doc, mL, p, cW, SUCCESS, '✓')
    }
    y += 4
  }

  // --- Points d'attention ---
  if (sections.concerns.length > 0) {
    checkPage(16)
    sectionHeader(doc, mL, y, cW, 'POINTS D’ATTENTION')
    y += 12
    for (const c of sections.concerns) {
      checkPage(10)
      iconItem(doc, mL, c, cW, WARNING, '!')
    }
    y += 4
  }

  // --- Actions a suivre ---
  checkPage(16)
  sectionHeader(doc, mL, y, cW, 'ACTIONS À SUIVRE')
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
    doc.text('Aucune action identifiée — à compléter.', mL + 4, y)
    y += 6
  }
  y += 4

  // --- Documents ---
  if (sections.documents.length > 0) {
    checkPage(16)
    sectionHeader(doc, mL, y, cW, 'DOCUMENTS MENTIONNÉS / À COLLECTER')
    y += 12
    for (const d of sections.documents) {
      checkPage(8)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...TEXT_700)
      doc.text(`• ${d}`, mL + 4, y)
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
  const filename = `CR_${interview.title.replace(/[^a-zA-Z0-9à-ü]/g, '_').slice(0, 40)}_${interview.scheduled_date}.pdf`
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
