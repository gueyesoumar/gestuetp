import { pdf } from '@react-pdf/renderer'
import type { AuditReportData } from '../generateAuditReportPDF'
import { AuditReportDocument } from './AuditReportDocument'
import { computeReportRef } from './report-model'

// Rendu v2 (react-pdf), 100% cote client (confidentialite des donnees, D-REP-1).
// Ce module n'est atteint que via la modale d'apercu (chargee en React.lazy), donc
// react-pdf reste hors du bundle initial.
export async function renderAuditReportV2(data: AuditReportData): Promise<void> {
  const blob = await pdf(<AuditReportDocument data={data} />).toBlob()
  const ref = computeReportRef(data.mission.id, data.mission.end_date)
  const safeName = (data.client?.client_name ?? data.mission.name).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
  const year = new Date(data.mission.end_date ?? Date.now()).getFullYear()
  triggerDownload(blob, `Rapport_audit_${safeName}_${year}_${ref}.pdf`)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
