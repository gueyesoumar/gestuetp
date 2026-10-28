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
  'Industrie / Fabrication',
  'Logistique / Transport',
  'Médias / Communication',
  'Mines / Extraction',
  'ONG / Associations',
  'Santé / Pharmaceutique',
  'Services aux entreprises',
  'Télécommunications',
  'Technologies / Informatique',
  'Tourisme',
  'Autre',
] as const

// Taxonomie secteur public / parapublic (édition régulateur). Utilisée pour étiqueter
// les modèles de scénarios de risque par secteur et pour filtrer le sélecteur à la
// création. Inclut les valeurs déjà présentes sur les assujettis existants.
export const PUBLIC_SECTORS = [
  'Administration publique',
  'Fiscalité',
  'Douanes',
  'Trésor / Finances publiques',
  'Justice',
  'Défense / Sécurité intérieure',
  'Élections / État civil',
  'Statistique nationale',
  'Collectivités territoriales',
  "Infrastructure numérique de l'État",
  'Énergie',
  'Eau / Assainissement',
  'Télécommunications',
  'Transport',
  'Ports',
  'Aéroports / Aviation civile',
  'Santé publique',
  'Protection sociale',
  'Éducation / Formation',
  'Agriculture / Élevage / Pêche',
  'Environnement',
] as const

// Gëstu Vendor (RFC 0020) : options du registre des tiers / fournisseurs.
export const VENDOR_DATA_ACCESS_OPTIONS = [
  { value: 'aucun', label: 'Aucun accès' },
  { value: 'limite', label: 'Accès limité' },
  { value: 'etendu', label: 'Accès étendu' },
  { value: 'critique', label: 'Accès critique' },
] as const

export const VENDOR_CRITICALITY_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'eleve', label: 'Critique' },
] as const

export const VENDOR_CLASSIFICATION_OPTIONS = [
  { value: 'major_nc', label: 'Non-conformité majeure' },
  { value: 'minor_nc', label: 'Non-conformité mineure' },
  { value: 'observation', label: 'Observation' },
  { value: 'strength', label: 'Point fort' },
] as const

// Gravite d'une action corrective (CAR de mission et actions manuelles regulateur).
// Memes valeurs que la classification des constats, sans 'strength' (une action
// n'est jamais un point fort).
export const ACTION_CLASSIFICATION_OPTIONS = [
  { value: 'major_nc', label: 'Non-conformité majeure' },
  { value: 'minor_nc', label: 'Non-conformité mineure' },
  { value: 'observation', label: 'Observation' },
] as const

export const VENDOR_PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critique' },
  { value: 'high', label: 'Élevée' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'low', label: 'Faible' },
] as const

export const VENDOR_QUALIFICATION_OPTIONS = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'en_evaluation', label: 'En évaluation' },
  { value: 'qualifie', label: 'Qualifié' },
  { value: 'qualifie_conditions', label: 'Qualifié sous conditions' },
  { value: 'non_qualifie', label: 'Non qualifié' },
  { value: 'suspendu', label: 'Suspendu' },
] as const

// Cadence de re-evaluation par defaut, selon la criticite (mois). Pre-remplit la cloture.
export const VENDOR_REASSESS_MONTHS: Record<string, number> = { eleve: 12, standard: 24 }
export const VENDOR_REASSESS_DEFAULT_MONTHS = 12

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
  { value: 'business_unit', label: 'Unité d\'affaires' },
] as const

// Types d'assujetti pour Gëstu Regul (entités publiques sénégalaises). Distincts
// des types Comply (filiale/site...). Valeurs = clés stables ; libellés éditables.
export const REGUL_ENTITY_TYPE_OPTIONS = [
  { value: 'ministere', label: 'Ministère' },
  { value: 'direction_generale', label: 'Direction Générale' },
  { value: 'agence', label: 'Agence' },
  { value: 'societe_nationale', label: 'Société Nationale' },
  { value: 'operateur', label: 'Opérateur' },
  { value: 'institution_financiere', label: 'Institution Financière' },
  { value: 'autre', label: 'Autre' },
] as const

export type EntityType =
  | typeof ENTITY_TYPE_OPTIONS[number]['value']
  | typeof REGUL_ENTITY_TYPE_OPTIONS[number]['value']

// Moteurs de mission (RFC 0003). Le moteur d'une org est posé par le superadmin
// (symétrique, aucune dérivation de l'édition) ; une mission fige (snapshot) le
// moteur de son org à la création. Valeurs = clés stables.
export const WORKFLOW_ENGINE_OPTIONS = [
  { value: 'audit', label: 'Audit complet' },
  { value: 'controle', label: 'Contrôle' },
] as const
export type WorkflowVersion = typeof WORKFLOW_ENGINE_OPTIONS[number]['value']

// Profil réglementaire d'un assujetti (Gëstu Regul / M1).
// Criticité NEUTRE et configurable : ajuster ces libellés (et eux seuls) pour
// adopter la terminologie officielle retenue (ex. « Entité essentielle », ou le
// terme sénégalais quand il sera arrêté). Les valeurs sont des clés stables.
export const CRITICALITY_OPTIONS = [
  { value: 'eleve', label: 'IIC (Infrastructure d\'Information Critique)' },
  { value: 'standard', label: 'Standard' },
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
  business_unit: 'Unité d\'affaires',
  ministere: 'Ministère',
  direction_generale: 'Direction Générale',
  agence: 'Agence',
  societe_nationale: 'Société Nationale',
  operateur: 'Opérateur',
  institution_financiere: 'Institution Financière',
  autre: 'Autre',
}

export const PERMISSION_LABELS: Record<string, string> = {
  can_create_mission: 'Créer des missions',
  can_assign_team: 'Assigner des équipes',
  can_be_lead: 'Être auditeur principal',
  can_designate_lead: 'Désigner un auditeur principal',
  can_delete_mission: 'Supprimer des missions',
  can_manage_members: 'Gérer les membres',
  can_manage_clients: 'Gérer les clients',
  can_edit_organization: "Modifier l'organisation",
  can_manage_roles: 'Gérer les rôles',
  can_view_audit_trail: "Voir la piste d'audit",
  can_view_supervision: 'Voir la supervision',
  can_create_campaign: 'Créer des campagnes',
  can_manage_subsidiaries: 'Gérer les filiales',
  can_view_entity_detail: "Voir le détail d'une entité",
  can_manage_sectors: 'Gérer les secteurs',
} as const

export const DASHBOARD_VIEW_LABELS: Record<string, string> = {
  executive: 'Direction',
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

// -- Centre d'aide : types de demande (Phase 1) --
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

// Gëstu Regul (M5) - incidents cyber
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

// -- Dimensions du score de confiance (mapping contrôle -> dimension) ----------
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

// Facteurs transverses : ils ne peuvent que TEMPERER le composite, jamais le
// gonfler (modele conservateur). coefficient = produit(1 - w * (1 - score/100))
// sur les facteurs mesures, borne au plancher. Assurance = facteur calcule
// (fraicheur/documentation des preuves), hors enum score_dimension.
export type ScoreFactorKey = 'human_factor' | 'third_party' | 'assurance'

export const SCORE_FACTOR_WEIGHTS: Record<ScoreFactorKey, number> = {
  human_factor: 0.15,
  third_party: 0.15,
  assurance: 0.2,
}

// Un facteur catastrophique ne peut pas effacer plus de la moitie de la posture.
export const SCORE_COEFFICIENT_FLOOR = 0.5

// Fenetre d'un cycle d'audit : au-dela, la preuve est consideree perimee.
export const ASSURANCE_FRESHNESS_MONTHS = 12

// Scellement gradue : valeur du signal selon l'etape de revue independante la
// plus profonde atteinte (approuvee). auditor_submitted ne scelle pas. Seule la
// chaine complete (client_review) merite le scellement maximal.
export const SEAL_STAGE_WEIGHTS: Record<'lead_review' | 'associate_review' | 'client_review', number> = {
  lead_review: 0.5,
  associate_review: 0.8,
  client_review: 1,
}

export const SCORE_FACTOR_LABELS: Record<ScoreFactorKey, string> = {
  human_factor: 'Facteur humain',
  third_party: 'Écosystème / tiers',
  assurance: 'Assurance des preuves',
}

export const SCORE_FACTOR_COLORS: Record<ScoreFactorKey, string> = {
  human_factor: '#E67E22',
  third_party: '#64748B',
  assurance: '#B8860B',
}

// ===== Gëstu Risk (RFC 0004) - cotation 4×4 + typologies =====
export const RISK_LIKELIHOOD_LEVELS = [
  { value: 1, label: 'Rare' },
  { value: 2, label: 'Possible' },
  { value: 3, label: 'Probable' },
  { value: 4, label: 'Quasi-sûr' },
] as const
export const RISK_IMPACT_LEVELS = [
  { value: 1, label: 'Mineur' },
  { value: 2, label: 'Modéré' },
  { value: 3, label: 'Majeur' },
  { value: 4, label: 'Critique' },
] as const
export const RISK_ASSET_CATEGORIES = [
  { value: 'application', label: 'Application' },
  { value: 'data', label: 'Données' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'third_party', label: 'Tiers' },
  { value: 'process', label: 'Processus' },
  { value: 'people', label: 'Personnes' },
  { value: 'site', label: 'Site' },
] as const
export const RISK_TREATMENTS = [
  { value: 'untreated', label: 'Non traité' },
  { value: 'reduce', label: 'Réduire' },
  { value: 'accept', label: 'Accepter' },
  { value: 'transfer', label: 'Transférer' },
  { value: 'avoid', label: 'Éviter' },
] as const
export const RISK_TREATMENT_STATUS = [
  { value: 'open', label: 'Ouvert' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminé' },
] as const
export const RISK_CONTROL_LINK_KINDS = [
  { value: 'preventive', label: 'Préventive' },
  { value: 'detective', label: 'Détective' },
  { value: 'corrective', label: 'Corrective' },
] as const

export type RiskAssetCategory = typeof RISK_ASSET_CATEGORIES[number]['value']
export type RiskTreatment = typeof RISK_TREATMENTS[number]['value']
export type RiskTreatmentStatus = typeof RISK_TREATMENT_STATUS[number]['value']

export type RiskControlLinkKind = typeof RISK_CONTROL_LINK_KINDS[number]['value']

// Exposition 0..100 dérivée de la cotation 4×4 (Vraisemblance × Impact).
export function riskExposure(likelihood: number, impact: number): number {
  return Math.round(((likelihood * impact) / 16) * 100)
}

// Nœud papillon : préventive → côté vraisemblance (avant l'événement) ;
// détective/corrective → côté impact (après l'événement, limite la conséquence).
export function barrierSide(kind: RiskControlLinkKind): 'likelihood' | 'impact' {
  return kind === 'preventive' ? 'likelihood' : 'impact'
}

// Catalogue de leviers de traitement concrets proposés dans le simulateur, par
// dimension du risque. kind = côté nœud papillon (preventive/detective/corrective),
// eff = efficacité simulée par défaut (0..1). Le repli '_' s'applique quand la
// dimension est absente. Libellés = descriptions des actions ajoutées au plan.
export interface TreatmentLever { label: string; kind: RiskControlLinkKind; eff: number }
export const RISK_TREATMENT_LEVERS: Record<string, TreatmentLever[]> = {
  security: [
    { label: "Déployer l'authentification forte (MFA)", kind: 'preventive', eff: 0.75 },
    { label: 'Segmenter le réseau (IT/OT, cloisonnement)', kind: 'preventive', eff: 0.7 },
    { label: 'Durcir et corriger les serveurs exposés', kind: 'preventive', eff: 0.7 },
    { label: 'Déployer une détection (EDR, supervision)', kind: 'detective', eff: 0.6 },
    { label: 'Filtrer la messagerie et bloquer les pièces jointes piégées', kind: 'preventive', eff: 0.6 },
  ],
  resilience: [
    { label: 'Mettre en place des sauvegardes hors ligne testées', kind: 'corrective', eff: 0.8 },
    { label: "Élaborer et tester un plan de reprise d'activité (PRA)", kind: 'corrective', eff: 0.75 },
    { label: "Redonder l'alimentation (onduleurs, groupe électrogène)", kind: 'corrective', eff: 0.7 },
    { label: 'Mettre en place une protection anti-DDoS', kind: 'preventive', eff: 0.6 },
    { label: 'Prévoir un site de secours', kind: 'corrective', eff: 0.7 },
  ],
  data_protection: [
    { label: 'Chiffrer les données sensibles au repos', kind: 'corrective', eff: 0.8 },
    { label: 'Cloisonner les accès (moindre privilège)', kind: 'preventive', eff: 0.7 },
    { label: 'Minimiser et anonymiser les données', kind: 'corrective', eff: 0.6 },
    { label: 'Détecter les accès et exfiltrations anormaux', kind: 'detective', eff: 0.6 },
  ],
  integrity: [
    { label: 'Séparer les tâches et exiger une double validation', kind: 'preventive', eff: 0.75 },
    { label: "Mettre en place des contrôles d'intégrité et rapprochements", kind: 'detective', eff: 0.65 },
    { label: 'Journaliser de façon inaltérable (scellement)', kind: 'detective', eff: 0.6 },
  ],
  governance: [
    { label: 'Désigner un RSSI et formaliser la PSSI', kind: 'preventive', eff: 0.6 },
    { label: 'Mettre les traitements en conformité (CDP, loi 2008-12)', kind: 'preventive', eff: 0.6 },
    { label: 'Instaurer un comité de sécurité et arbitrer les risques', kind: 'preventive', eff: 0.55 },
  ],
  verifiability: [
    { label: 'Centraliser la journalisation (SIEM)', kind: 'detective', eff: 0.7 },
    { label: 'Horodater et conserver les traces', kind: 'detective', eff: 0.6 },
    { label: 'Mettre en place une revue périodique des journaux', kind: 'detective', eff: 0.55 },
  ],
  human_factor: [
    { label: "Sensibiliser et simuler des campagnes d'hameçonnage", kind: 'preventive', eff: 0.6 },
    { label: "Déployer l'authentification forte (MFA)", kind: 'preventive', eff: 0.75 },
    { label: 'Revoir et révoquer les habilitations', kind: 'preventive', eff: 0.65 },
  ],
  third_party: [
    { label: 'Imposer des clauses de sécurité et auditer les prestataires', kind: 'preventive', eff: 0.6 },
    { label: 'Encadrer et journaliser la télémaintenance', kind: 'detective', eff: 0.6 },
    { label: 'Privilégier un hébergement souverain et la réversibilité', kind: 'corrective', eff: 0.6 },
  ],
  _: [
    { label: 'Ajouter une barrière préventive (réduit la vraisemblance)', kind: 'preventive', eff: 0.7 },
    { label: "Ajouter une barrière corrective (réduit l'impact)", kind: 'corrective', eff: 0.7 },
  ],
}

// Efficacités moyennes par côté (préventif ↓ vraisemblance, correctif ↓ impact).
// null = aucune barrière de ce côté → le facteur reste inchangé.
export function splitBarrierEfficacies(
  barriers: ReadonlyArray<{ kind: RiskControlLinkKind; effectiveness: number }>,
): { effPrev: number | null; effCorr: number | null } {
  const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null)
  return {
    effPrev: mean(barriers.filter((b) => barrierSide(b.kind) === 'likelihood').map((b) => b.effectiveness)),
    effCorr: mean(barriers.filter((b) => barrierSide(b.kind) === 'impact').map((b) => b.effectiveness)),
  }
}

// Résiduel EBIOS par nœud papillon : la vraisemblance est abaissée par les
// barrières préventives, l'impact par les correctives. effPrev/effCorr ∈ [0..1]
// ou null (côté sans barrière). Retourne l'exposition résiduelle 0..100.
export function riskResidualSplit(
  likelihood: number, impact: number, effPrev: number | null, effCorr: number | null,
): number {
  const rL = effPrev == null ? likelihood : likelihood * (1 - effPrev)
  const rI = effCorr == null ? impact : impact * (1 - effCorr)
  return riskExposure(rL, rI)
}

// Poids du facteur risk_mastery dans le coefficient conservateur (= assurance).
export const RISK_MASTERY_WEIGHT = 0.2

// RFC 0017 Lot 1 - critères de risque : défauts plateforme (fallback si aucune
// ligne risk_criteria pour l'org) + cycle de vie ISO 27005.
export const DEFAULT_ACCEPTANCE_THRESHOLD = 60
export const DEFAULT_REVIEW_MONTHS = 6
// Origine d'un risque (#4). self=saisie propre de l'organisation, regulator=créé par le
// régulateur superviseur, system=issu de Gëstu Regul (promotion constat/mission/modèle).
export const RISK_SOURCE_LABELS: Record<string, string> = {
  self: 'Assujetti',
  regulator: 'Autorité',
  system: 'Gëstu Regul',
}
export const RISK_SOURCE_HINTS: Record<string, string> = {
  self: "Saisi par l'assujetti lui-même",
  regulator: "Créé par l'autorité de supervision",
  system: "Issu de Gëstu Regul (promotion d'un constat, d'une mission ou d'un modèle)",
}

// Actions de traitement proposées au régulateur selon la dimension du risque (#8).
// Suggestions préremplissant la demande ; la saisie libre reste possible.
export const RISK_DIRECTIVE_SUGGESTIONS: Record<string, string[]> = {
  security: [
    "Déployer l'authentification multifacteur (MFA) sur les comptes à privilèges",
    'Appliquer les correctifs de sécurité critiques sous 30 jours',
    'Segmenter le réseau et filtrer les flux entrants',
    'Durcir les configurations selon un référentiel reconnu (CIS, PSSI-ES)',
  ],
  data_protection: [
    'Chiffrer les données sensibles au repos et en transit',
    'Appliquer le moindre privilège sur les accès aux données',
    'Cartographier et classifier les données à caractère personnel (loi 2008-12)',
    'Journaliser et superviser les accès aux données sensibles',
  ],
  resilience: [
    'Mettre en place des sauvegardes régulières, testées et hors ligne',
    'Élaborer et tester un plan de continuité et de reprise (PCA/PRA)',
    'Définir des objectifs RTO/RPO par service essentiel',
  ],
  integrity: [
    "Mettre en place un contrôle d'intégrité des fichiers et des journaux",
    'Séparer les environnements de développement, de test et de production',
    'Formaliser la gestion des changements',
  ],
  governance: [
    'Nommer un RSSI et formaliser la politique de sécurité (PSSI)',
    'Mettre en place un comité de sécurité et un suivi des risques',
    'Définir des indicateurs de sécurité et un reporting périodique',
  ],
  verifiability: [
    "Activer une piste d'audit inviolable des actions sensibles",
    'Planifier des audits de sécurité périodiques',
    'Conserver les preuves de conformité',
  ],
  human_factor: [
    'Sensibiliser et former le personnel à la sécurité',
    'Mettre en place une charte et des engagements de confidentialité',
    'Gérer les habilitations lors des arrivées et des départs',
  ],
  third_party: [
    'Évaluer la sécurité des prestataires avant contractualisation',
    "Inscrire des clauses de sécurité et d'audit dans les contrats",
    'Suivre et réévaluer périodiquement les tiers critiques',
  ],
}
// Cadences de revue proposees (en mois). Centralisees pour coherence (cf feedback_form_selects).
export const REVIEW_CADENCE_OPTIONS = [
  { value: 1, label: 'Mensuelle (1 mois)' },
  { value: 3, label: 'Trimestrielle (3 mois)' },
  { value: 6, label: 'Semestrielle (6 mois)' },
  { value: 12, label: 'Annuelle (12 mois)' },
] as const
export const RISK_LIFECYCLE_STATUS = [
  { value: 'identified', label: 'Identifié' },
  { value: 'analysed', label: 'Analysé' },
  { value: 'evaluated', label: 'Évalué' },
  { value: 'treatment_planned', label: 'Traitement planifié' },
  { value: 'in_treatment', label: 'En traitement' },
  { value: 'residual_accepted', label: 'Résiduel accepté' },
  { value: 'monitored', label: 'Surveillé' },
  { value: 'closed', label: 'Clôturé' },
  { value: 'reopened', label: 'Rouvert' },
] as const

// RFC 0017 Lot 2 - statuts d'une action de traitement.
export const RISK_ACTION_STATUS = [
  { value: 'todo', label: 'À faire' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'done', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
] as const

// RFC 0017 Lot 4 - décisions de revue périodique.
export const RISK_REVIEW_DECISIONS = [
  { value: 'maintain', label: 'Maintenir' },
  { value: 'retreat', label: 'Re-traiter' },
  { value: 'accept', label: 'Accepter' },
  { value: 'close', label: 'Clôturer' },
  { value: 'reopen', label: 'Rouvrir' },
] as const

// ---- Boucle Regul → Risk : un incident aggrave la vraisemblance ----
// Mapping nature d'incident → dimension du score (ajustable). 'autre' = neutre.
export const INCIDENT_CATEGORY_DIMENSION: Record<string, ScoreDimensionKey | null> = {
  intrusion: 'security',
  ransomware: 'resilience',
  fuite_donnees: 'data_protection',
  deni_service: 'resilience',
  autre: null,
}

// Aggravation conservatrice de la vraisemblance selon la gravité de l'incident.
export function incidentSeverityBump(severity: string): number {
  return severity === 'critique' ? 2 : severity === 'eleve' ? 1 : 0
}

// Fenêtre de pertinence d'un incident sur la vraisemblance (mois).
export const INCIDENT_WINDOW_MONTHS = 12

// Aggravation de la vraisemblance d'un scénario par les incidents (mode hybride) :
// un incident explicitement lié à CE scénario s'applique toujours ; sinon, un
// incident SANS lien explicite s'applique automatiquement aux scénarios de sa
// dimension. Retourne le bump (0..2) = gravité max des incidents applicables.
export function incidentLikelihoodBump(
  dimension: ScoreDimensionKey | null,
  scenarioIncidentIds: ReadonlySet<string>,
  incidents: ReadonlyArray<{ id: string; category: string; severity: string }>,
  linkedIncidentIds: ReadonlySet<string>,
): number {
  let bump = 0
  for (const inc of incidents) {
    const applies = scenarioIncidentIds.has(inc.id)
      || (!linkedIncidentIds.has(inc.id) && INCIDENT_CATEGORY_DIMENSION[inc.category] === dimension)
    if (applies) bump = Math.max(bump, incidentSeverityBump(inc.severity))
  }
  return bump
}

// ---- Gëstu Policy (RFC 0005) ----
export const POLICY_STATUS = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'in_review', label: 'En revue' },
  { value: 'approved', label: 'Approuvée' },
  { value: 'published', label: 'Publiée' },
  { value: 'revision', label: 'Révision' },
  { value: 'retired', label: 'Retirée' },
] as const

export const POLICY_PROVENANCE = [
  { value: 'native', label: 'Rédigée' },
  { value: 'ai', label: 'Générée par IA' },
  { value: 'imported', label: 'Importée' },
] as const

export const POLICY_EFFECTIVENESS_STATUS = [
  { value: 'applied', label: 'Appliquée' },
  { value: 'partial', label: 'Partielle' },
  { value: 'not_verified', label: 'Non vérifiée' },
] as const

export const EVIDENCE_KINDS = [
  { value: 'document', label: 'Document' },
  { value: 'policy', label: 'Politique' },
  { value: 'record', label: 'Enregistrement' },
  { value: 'config', label: 'Configuration' },
] as const

// Force de preuve d'une politique (Policy-as-Evidence graduée) : approuvée/publiée
// + appliquée = forte ; approuvée/publiée seule = faible ; sinon nulle.
export type PolicyEvidenceStrength = 'strong' | 'weak' | 'none'
export function policyEvidenceStrength(status: string, applied: boolean): PolicyEvidenceStrength {
  if (status !== 'approved' && status !== 'published') return 'none'
  return applied ? 'strong' : 'weak'
}
export const POLICY_EVIDENCE_WEIGHT: Record<PolicyEvidenceStrength, number> = { strong: 1, weak: 0.5, none: 0 }

// Poids du facteur de maturité de gouvernance (Policy) dans le coefficient conservateur.
export const POLICY_MATURITY_WEIGHT = 0.15
