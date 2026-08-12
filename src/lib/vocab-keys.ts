import type { ProductVocab } from './product'

// Clés de vocab éditables (RFC 0002). Chaque clé appartient à une FAMILLE, pour
// l'éditeur de terminologie structuré (nav latérale + panneau + aperçu live).
export type VocabGroupId = 'entity' | 'work' | 'actors' | 'portal'

export interface VocabGroup {
  id: VocabGroupId
  label: string
  icon: string
  description: string
}

export const VOCAB_GROUPS: VocabGroup[] = [
  { id: 'entity', label: 'Entité auditée', icon: '🏛️', description: 'Comment l’organisation nomme la partie contrôlée.' },
  { id: 'work', label: 'Vocabulaire métier', icon: '📋', description: 'Les termes du travail d’audit.' },
  { id: 'actors', label: 'Acteurs & validation', icon: '👥', description: 'Rôles internes et côté partie auditée.' },
  { id: 'portal', label: 'Portail & contexte', icon: '🖥️', description: 'Coquille du portail et bandeaux.' },
]

export interface VocabKeyDef {
  key: string
  label: string
  field: keyof ProductVocab
  group: VocabGroupId
  type?: 'text' | 'gender'
  hint?: string
}

export const EDITABLE_VOCAB_KEYS: VocabKeyDef[] = [
  { key: 'entity_singular', label: 'Entité — singulier', field: 'entitySingular', group: 'entity', hint: 'ex. client, assujetti, opérateur' },
  { key: 'entity_plural', label: 'Entité — pluriel', field: 'entityPlural', group: 'entity' },
  { key: 'entities_title', label: 'Titre de section / navigation', field: 'entitiesTitle', group: 'entity' },
  { key: 'entity_with_dem', label: 'Forme démonstrative', field: 'entityWithDem', group: 'entity', hint: 'ex. « concernant cet assujetti »' },
  { key: 'entity_gender', label: 'Genre grammatical', field: 'entityGender', group: 'entity', type: 'gender', hint: 'pilote l’accord (un/une, rattaché·e)' },
  { key: 'mission_term', label: 'Terme « mission »', field: 'missionTerm', group: 'work', hint: 'ex. Missions, Contrôles' },
  { key: 'finding_term', label: 'Terme « constat »', field: 'findingTerm', group: 'work' },
  { key: 'measure_term', label: 'Terme « mesure »', field: 'measureTerm', group: 'work', hint: 'ex. recommandation, mesure, injonction' },
  { key: 'provider_term', label: 'Rôle émetteur', field: 'providerTerm', group: 'actors', hint: 'ex. cabinet, régulateur, autorité (emails)' },
  { key: 'auditor_term', label: 'Rôle auditeur', field: 'auditorTerm', group: 'actors', hint: 'ex. auditeur, contrôleur, inspecteur (emails)' },
  { key: 'lead_term', label: 'Validation — niveau 1 (chef)', field: 'leadTerm', group: 'actors', hint: 'ex. Chef de mission, Manager' },
  { key: 'associate_term', label: 'Validation — niveau 2 (associé)', field: 'associateTerm', group: 'actors', hint: 'ex. Associé, Partner, Directeur' },
  { key: 'client_approver_term', label: 'Rôle client — approbateur', field: 'clientApproverTerm', group: 'actors', hint: 'signe la validation côté partie auditée' },
  { key: 'client_contributor_term', label: 'Rôle client — contributeur', field: 'clientContributorTerm', group: 'actors' },
  { key: 'client_viewer_term', label: 'Rôle client — lecteur', field: 'clientViewerTerm', group: 'actors' },
  { key: 'portal_label', label: 'Libellé du portail', field: 'portalLabel', group: 'portal' },
  { key: 'context_banner', label: 'Bandeau de contexte', field: 'contextBanner', group: 'portal', hint: 'vide = pas de bandeau' },
  { key: 'context_banner_sub', label: 'Bandeau — sous-titre', field: 'contextBannerSub', group: 'portal' },
]
