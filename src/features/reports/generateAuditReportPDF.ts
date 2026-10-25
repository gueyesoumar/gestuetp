// Façade de TYPES du rapport d'audit. Le moteur jsPDF a été retiré (RFC 0021 Lot 4) ;
// le rendu se fait via audit-report-v2 (react-pdf). On conserve ce point d'import
// historique pour les types partagés (loader, narratives, moteur v2).
export type {
  AssessmentWithControl,
  AuditReportData,
  AuditTotals,
  ClientContact,
  DomainStat,
  EvidenceDoc,
} from './audit-report/context'
