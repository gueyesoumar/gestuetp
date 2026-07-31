// Constantes centralisees pour les listes deroulantes
// Utiliser ces valeurs partout pour garantir la coherence

import type { SupportDemandeSubtype, SupportNature, SupportStatus } from '../types/database.types'

export const EFFECTIFS_OPTIONS = [
  'Moins de 50',
  '50 à 250',
  '250 à 1 000',
  '1 000 à 5 000',
  'Plus de 5 000',
] as const

export const SECTEURS_OPTIONS = [
  'Administration publique',
  'Agriculture',
  'Assurance',
  'Banque / Finance',
  'BTP / Construction',
  'Commerce / Distribution',
  'Conseil',
  'Défense',
  'Éducation / Formation',
  'Énergie',
  'Hôtellerie / Restauration',
  'Immobilier',
  'Industrie / Manufacturing',
  'Logistique / Transport',
  'Médias / Communication',
  'Mines / Extraction',
  'ONG / Associations',
  'Santé / Pharmaceutique',
  'Services aux entreprises',
  'Télécommunications',
  'Technologies / IT',
  'Tourisme',
  'Autre',
] as const

export const PAYS_OPTIONS = [
  'Bénin',
  'Burkina Faso',
  'Cameroun',
  'Canada',
  'Côte d\'Ivoire',
  'France',
  'Gabon',
  'Guinée',
  'Mali',
  'Maroc',
  'Maurice',
  'Niger',
  'République Démocratique du Congo',
  'Sénégal',
  'Suisse',
  'Togo',
  'Tunisie',
  'Autre',
] as const

export const CHIFFRE_AFFAIRES_OPTIONS = [
  'Moins de 100M FCFA',
  '100M - 500M FCFA',
  '500M - 1Md FCFA',
  '1Md - 5Mds FCFA',
  '5Mds - 20Mds FCFA',
  'Plus de 20Mds FCFA',
] as const

export const IMPACT_OPTIONS = [
  { value: 'fort', label: 'Fort' },
  { value: 'moyen', label: 'Moyen' },
  { value: 'faible', label: 'Faible' },
] as const

export const EXIGENCE_TYPE_OPTIONS = [
  { value: 'legale', label: 'Légale' },
  { value: 'reglementaire', label: 'Réglementaire' },
  { value: 'contractuelle', label: 'Contractuelle' },
  { value: 'normative', label: 'Normative' },
] as const

export const PARTIE_INTERESSEE_TYPE_OPTIONS = [
  { value: 'interne', label: 'Interne' },
  { value: 'externe', label: 'Externe' },
] as const

// Valeurs canoniques (anglais) alignées sur les helpers organization-utils.ts
// et la contrainte CHECK organizations_types_canonical (migration 00094).
// 'platform' est volontairement absent : réservé au super-admin Gëstu via
// l'edge function admin-update-organization, jamais coché-able par un user.
export const ORG_TYPE_OPTIONS = [
  { value: 'cabinet', label: 'Cabinet de conseil' },
  { value: 'client', label: 'Client' },
  { value: 'group', label: 'Groupe / Holding' },
] as const

// Nature d'une entité interne d'un groupe (module Groupe, refonte Axe 1).
// Centralisé pour cohérence des selects (create/edit entité).
export const ENTITY_TYPE_OPTIONS = [
  { value: 'filiale', label: 'Filiale' },
  { value: 'site', label: 'Site' },
  { value: 'direction', label: 'Direction' },
  { value: 'business_unit', label: 'Business Unit' },
] as const

export type EntityType = typeof ENTITY_TYPE_OPTIONS[number]['value']

// Profil réglementaire d'un assujetti (Gëstu Regul / M1).
// Criticité NEUTRE et configurable : ajuster ces libellés (et eux seuls) pour
// adopter la terminologie officielle retenue (ex. « Entité essentielle », ou le
// terme sénégalais quand il sera arrêté). Les valeurs sont des clés stables.
export const CRITICALITY_OPTIONS = [
  { value: 'eleve', label: 'Criticité élevée' },
  { value: 'standard', label: 'Criticité standard' },
  { value: 'indetermine', label: 'Indéterminée' },
] as const
export type Criticality = typeof CRITICALITY_OPTIONS[number]['value']
export const CRITICALITY_LABELS: Record<string, string> =
  Object.fromEntries(CRITICALITY_OPTIONS.map((o) => [o.value, o.label]))

export const REG_STATUS_OPTIONS = [
  { value: 'active', label: 'Dans le périmètre' },
  { value: 'exited', label: 'Sorti du périmètre' },
] as const

// Mesures graduées du régulateur (Gëstu Regul / M4).
export const MEASURE_TYPE_ORDER = ['recommandation', 'mise_en_demeure', 'injonction', 'sanction'] as const
export type MeasureType = typeof MEASURE_TYPE_ORDER[number]

export const MEASURE_TYPE_LABELS: Record<MeasureType, string> = {
  recommandation: 'Recommandation',
  mise_en_demeure: 'Mise en demeure',
  injonction: 'Injonction',
  sanction: 'Sanction',
}

export const MEASURE_STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  issued: 'Émise',
  acknowledged: 'Accusée',
  resolved: 'Résolue',
  appealed: 'Contestée',
  closed: 'Clôturée',
}

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  filiale: 'Filiale',
  site: 'Site',
  direction: 'Direction',
  business_unit: 'Business Unit',
}

export const PERMISSION_LABELS: Record<string, string> = {
  can_create_mission: 'Créer des missions',
  can_assign_team: 'Assigner des équipes',
  can_be_lead: 'Être auditeur principal',
  can_designate_lead: 'Désigner un auditeur principal',
} as const

export const DASHBOARD_VIEW_LABELS: Record<string, string> = {
  executive: 'Executive',
  pilotage: 'Pilotage',
  operationnel: 'Opérationnel',
} as const

export const DASHBOARD_VIEW_DESCRIPTIONS: Record<string, string> = {
  executive: 'Vue d\'ensemble : portefeuille clients, pipeline, respect des délais, charge équipe',
  pilotage: 'Suivi des missions : progression, pipeline de revue, rejets, charge de l\'équipe',
  operationnel: 'Mes tâches : contrôles à traiter, entretiens, progression personnelle',
} as const

export const MEMBER_AUDIT_ACTION_LABELS: Record<string, string> = {
  invited: 'Invitation envoyée',
  role_assigned: 'Rôle attribué',
  role_removed: 'Rôle retiré',
  deactivated: 'Compte désactivé',
  reactivated: 'Compte réactivé',
  invitation_resent: 'Invitation renvoyée',
} as const

// ── Centre d'aide : types de demande (Phase 1) ──
// UserRole ne distingue que 'auditor' | 'client' ; la notion d'admin releve des
// permissions cabinet, verifiees au fulfillment (Phase 1.b), pas a l'intake.
export type SupportRequesterRole = 'client' | 'auditor'

export interface DemandeTypeOption {
  subtype: SupportDemandeSubtype
  label: string
  description: string
  /** Rôles autorisés à soumettre ce type. */
  roles: SupportRequesterRole[]
  /** 'act' = action immédiate (ex: email de reset) ; 'request' = crée un ticket à traiter. */
  handling: 'act' | 'request'
  /** Acteur qui traite la demande (pour 'request'). */
  routedTo?: 'cabinet_admin' | 'platform_owner' | 'cabinet_or_owner'
}

export const SUPPORT_DEMANDE_TYPES: DemandeTypeOption[] = [
  {
    subtype: 'password_reset',
    label: 'Réinitialiser mon mot de passe',
    description: 'Recevoir un lien de réinitialisation par email.',
    roles: ['client', 'auditor'],
    handling: 'act',
  },
  {
    subtype: 'feature_activation',
    label: 'Activer une fonctionnalité',
    description: 'Demander l’activation d’un module non disponible.',
    roles: ['auditor'],
    handling: 'request',
    routedTo: 'cabinet_or_owner',
  },
  {
    subtype: 'plan_change',
    label: 'Changer de plan',
    description: 'Faire évoluer votre abonnement.',
    roles: ['auditor'],
    handling: 'request',
    routedTo: 'platform_owner',
  },
  {
    subtype: 'access_member',
    label: 'Gérer un accès ou un membre',
    description: 'Inviter, retirer ou changer le rôle d’un membre.',
    roles: ['auditor'],
    handling: 'request',
    routedTo: 'cabinet_admin',
  },
]

/** Types de demande visibles pour un rôle donné. */
export function demandeTypesForRole(role: SupportRequesterRole): DemandeTypeOption[] {
  return SUPPORT_DEMANDE_TYPES.filter((t) => t.roles.includes(role))
}

export const SUPPORT_NATURE_LABELS: Record<SupportNature, string> = {
  bug: 'Bug',
  demande: 'Demande',
  suggestion: 'Suggestion',
}

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: 'Ouvert',
  in_progress: 'En cours',
  answered: 'Répondu',
  escalated: 'Escaladé',
  resolved: 'Résolu',
  closed: 'Fermé',
}

// Gëstu Regul (M5) — incidents cyber
export const INCIDENT_CATEGORY_OPTIONS = [
  { value: 'intrusion', label: 'Intrusion' },
  { value: 'ransomware', label: 'Rançongiciel' },
  { value: 'fuite_donnees', label: 'Fuite de données' },
  { value: 'deni_service', label: 'Déni de service' },
  { value: 'autre', label: 'Autre' },
] as const
export const INCIDENT_CATEGORY_LABELS: Record<string, string> =
  Object.fromEntries(INCIDENT_CATEGORY_OPTIONS.map((o) => [o.value, o.label]))

export const INCIDENT_SEVERITY_ORDER = ['faible', 'moyen', 'eleve', 'critique'] as const
export type IncidentSeverity = typeof INCIDENT_SEVERITY_ORDER[number]
export const INCIDENT_SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  faible: 'Faible',
  moyen: 'Moyen',
  eleve: 'Élevé',
  critique: 'Critique',
}

export const INCIDENT_STATUS_ORDER = ['declared', 'triage', 'notified', 'resolved', 'closed'] as const
export type IncidentStatus = typeof INCIDENT_STATUS_ORDER[number]
export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  declared: 'Déclaré',
  triage: 'Qualification',
  notified: 'Notifié',
  resolved: 'Résolu',
  closed: 'Clôturé',
}

// ── Dimensions du score de confiance (mapping contrôle -> dimension) ──────────
// 6 dimensions (axes du radar) + 2 facteurs transverses (coefficients).
export const SCORE_DIMENSION_KEYS = [
  'security', 'data_protection', 'resilience', 'integrity',
  'governance', 'verifiability', 'human_factor', 'third_party',
] as const
export type ScoreDimensionKey = typeof SCORE_DIMENSION_KEYS[number]

export const SCORE_DIMENSION_LABELS: Record<ScoreDimensionKey, string> = {
  security: 'Sécurité',
  data_protection: 'Protection des données',
  resilience: 'Résilience & continuité',
  integrity: 'Intégrité & fiabilité',
  governance: 'Gouvernance & éthique',
  verifiability: 'Transparence & vérifiabilité',
  human_factor: 'Facteur humain',
  third_party: 'Écosystème / tiers',
}

// Couleurs de dimension (pastilles admin, lisibles sur fond clair).
export const SCORE_DIMENSION_COLORS: Record<ScoreDimensionKey, string> = {
  security: '#E07A5F',
  data_protection: '#7B68EE',
  resilience: '#0E9F8E',
  integrity: '#DB2777',
  governance: '#3B82F6',
  verifiability: '#2E9E6B',
  human_factor: '#E67E22',
  third_party: '#64748B',
}

// Nature : 'axis' = branche du radar (moyennée) ; 'factor' = coefficient transverse.
export const SCORE_DIMENSION_KIND: Record<ScoreDimensionKey, 'axis' | 'factor'> = {
  security: 'axis',
  data_protection: 'axis',
  resilience: 'axis',
  integrity: 'axis',
  governance: 'axis',
  verifiability: 'axis',
  human_factor: 'factor',
  third_party: 'factor',
}
