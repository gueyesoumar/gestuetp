import jsPDF from 'jspdf'
import {
  createContext,
  type AssessmentWithControl as _AssessmentWithControl,
  type AuditReportData as _AuditReportData,
  type AuditTotals as _AuditTotals,
  type ClientContact as _ClientContact,
  type DomainStat as _DomainStat,
  type EvidenceDoc as _EvidenceDoc,
} from './context'
import { loadImageAsDataURL } from './logo-loader'
import { finalizeHeadersFooters } from './page-chrome'
import { drawCoverPage, drawExecutiveLetter, drawTOC, finalizeTOC } from './prelim'
import {
  drawSection01Context, drawSection02Methodology, drawSection03ExecutiveSummary,
  drawSection04DomainDetails, drawSection05NCFactSheets, drawSection06Recommendations,
  drawSection07ActionPlan, drawSection08Conclusion,
} from './sections'
import {
  drawAnnexAGlossary, drawAnnexBEvidence, drawAnnexCReferences, drawAnnexDDistribution,
} from './annexes'

// Re-exports pour les modules externes (loadAuditReportData, auditReportNarratives, worker, …)
export type AssessmentWithControl = _AssessmentWithControl
export type AuditReportData = _AuditReportData
export type AuditTotals = _AuditTotals
export type ClientContact = _ClientContact
export type DomainStat = _DomainStat
export type EvidenceDoc = _EvidenceDoc

/**
 * Rapport d'audit V2 — Niveau B (style Deloitte adapté charte Gëstu).
 * ~25-30 pages, narratif détaillé, fiches NC individuelles, radar
 * de maturité, matrice de priorisation impact × effort, annexes.
 *
 * Toutes les données proviennent de loadAuditReportData().
 */

/**
 * Construit le PDF en memoire et retourne le blob + le nom de fichier.
 * Pas d'effet DOM : peut tourner dans un Web Worker.
 */
export async function buildAuditReportPdfBlob(data: AuditReportData): Promise<{ blob: Blob; filename: string }> {
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

  // Renseigner les numéros de page du sommaire, puis dessiner les
  // header/footer/watermark sur toutes les pages (sauf couverture).
  finalizeTOC(ctx)
  finalizeHeadersFooters(ctx)

  const safeName = (data.client?.client_name ?? data.mission.name).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
  const year = new Date(data.mission.end_date ?? Date.now()).getFullYear()
  const filename = `Rapport_audit_${safeName}_${year}_${ctx.reportRef}.pdf`
  const blob = doc.output('blob')
  return { blob, filename }
}

/**
 * Genere le PDF sur le main thread et declenche le telechargement via DOM.
 * Preserve pour compat (tests, scenarios sans worker). Prefere
 * runAuditReportPdfInWorker en production pour ne pas bloquer l'UI.
 */
export async function generateAuditReportPDF(data: AuditReportData): Promise<void> {
  const { blob, filename } = await buildAuditReportPdfBlob(data)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
