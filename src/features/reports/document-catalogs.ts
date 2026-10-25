// Registre des types de documents produits par le moteur react-pdf (RFC 0021 E2).
// Chaque type expose son catalogue de sections (socle report-kit/catalog). L'editeur
// de templates et la resolution des modeles s'appuient sur ce registre pour etre
// multi-documents. SANS dependance react-pdf : importe uniquement les catalogues.
import type { SectionCatalogEntry } from './report-kit/catalog'
import { SECTION_CATALOG as AUDIT_SECTIONS } from './audit-report-v2/section-catalog'
import { SCOPING_SECTION_CATALOG } from './scoping-note-v2/catalog'

export type DocumentType = 'audit_report' | 'scoping_note' | 'interview_cr'

export interface DocumentCatalog {
  type: DocumentType
  label: string
  catalog: SectionCatalogEntry[]
}

/** Types disponibles dans l'editeur. On n'y declare un type que lorsque son moteur
 *  react-pdf et son catalogue sont livres (audit_report = E2.0 ; cadrage/CR = E2.1/E2.2). */
export const DOCUMENT_CATALOGS: DocumentCatalog[] = [
  { type: 'audit_report', label: 'Rapport d\'audit', catalog: AUDIT_SECTIONS },
  { type: 'scoping_note', label: 'Note de cadrage', catalog: SCOPING_SECTION_CATALOG },
]

/** Catalogue de sections d'un type de document (repli : rapport d'audit). */
export function getSectionCatalog(documentType: string): SectionCatalogEntry[] {
  return DOCUMENT_CATALOGS.find((d) => d.type === documentType)?.catalog ?? AUDIT_SECTIONS
}
