// Façade : la génération du rapport d'audit a été éclatée dans ./audit-report/.
// Ce fichier préserve les imports historiques (worker, loader, narratives, …).
export {
  buildAuditReportPdfBlob,
  generateAuditReportPDF,
  type AssessmentWithControl,
  type AuditReportData,
  type AuditTotals,
  type ClientContact,
  type DomainStat,
  type EvidenceDoc,
} from './audit-report'
