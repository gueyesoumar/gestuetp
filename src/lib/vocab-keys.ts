import type { ProductVocab } from './product'

// Clés de vocab éditables (RFC 0002, P2b). Bornées à ce que le front applique via
// useVocab. provider_term / auditor_term (surtout emails) restent hors périmètre
// tant que le vocab n'est pas résolu côté serveur (increment « vocab serveur »).
export interface VocabKeyDef {
  key: string
  label: string
  field: keyof ProductVocab
  type?: 'text' | 'gender'
  hint?: string
}

export const EDITABLE_VOCAB_KEYS: VocabKeyDef[] = [
  { key: 'entity_singular', label: 'Entité — singulier', field: 'entitySingular', hint: 'ex. client, assujetti, opérateur' },
  { key: 'entity_plural', label: 'Entité — pluriel', field: 'entityPlural' },
  { key: 'entities_title', label: 'Titre de section / navigation', field: 'entitiesTitle' },
  { key: 'entity_with_dem', label: 'Forme démonstrative', field: 'entityWithDem', hint: 'ex. « concernant cet assujetti »' },
  { key: 'entity_gender', label: 'Genre grammatical', field: 'entityGender', type: 'gender', hint: 'pilote l’accord (un/une, rattaché·e)' },
  { key: 'mission_term', label: 'Terme « mission »', field: 'missionTerm', hint: 'ex. Missions, Contrôles' },
  { key: 'finding_term', label: 'Terme « constat »', field: 'findingTerm' },
  { key: 'measure_term', label: 'Terme « mesure »', field: 'measureTerm', hint: 'ex. recommandation, mesure, injonction' },
  { key: 'provider_term', label: 'Rôle émetteur', field: 'providerTerm', hint: 'ex. cabinet, régulateur, autorité (emails)' },
  { key: 'auditor_term', label: 'Rôle auditeur', field: 'auditorTerm', hint: 'ex. auditeur, contrôleur, inspecteur (emails)' },
  { key: 'lead_term', label: 'Validation — niveau 1 (chef)', field: 'leadTerm', hint: 'ex. Chef de mission, Manager' },
  { key: 'associate_term', label: 'Validation — niveau 2 (associé)', field: 'associateTerm', hint: 'ex. Associé, Partner, Directeur' },
  { key: 'client_approver_term', label: 'Rôle client — approbateur', field: 'clientApproverTerm', hint: 'signe la validation côté partie auditée' },
  { key: 'client_contributor_term', label: 'Rôle client — contributeur', field: 'clientContributorTerm' },
  { key: 'client_viewer_term', label: 'Rôle client — lecteur', field: 'clientViewerTerm' },
  { key: 'portal_label', label: 'Libellé du portail', field: 'portalLabel' },
  { key: 'context_banner', label: 'Bandeau de contexte', field: 'contextBanner', hint: 'vide = pas de bandeau' },
  { key: 'context_banner_sub', label: 'Bandeau — sous-titre', field: 'contextBannerSub' },
]
