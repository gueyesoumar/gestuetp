import type { MissionStatus, AssessmentStatus, ControlAssessment } from '../../types/database.types'

// Sémantique partagée : un contrôle est "complété" (= envoyé pour revue ou
// validé) dès lors que son assessment est passé du brouillon à un état
// post-soumission. C'est cette définition qu'utilisent à la fois
// useMissionProgress, DomainProgressList et FieldworkDomainGroup pour
// éviter les divergences entre la Vue d'ensemble et les Travaux.
export function isAssessmentCompleted(status: AssessmentStatus | string | null | undefined): boolean {
  return status === 'submitted' || status === 'in_review' || status === 'approved'
}

export function isAssessmentApproved(status: AssessmentStatus | string | null | undefined): boolean {
  return status === 'approved'
}

export function isAssessmentInProgress(assessment: Pick<ControlAssessment, 'status' | 'findings'>): boolean {
  // En cours = il y a un assessment ouvert (draft, rejected) avec OU sans findings
  return assessment.status === 'draft' || assessment.status === 'rejected'
}

export interface MissionPhase {
  key: MissionStatus | 'action_plan'
  label: string
  index: number
}

export const MISSION_PHASES: MissionPhase[] = [
  { key: 'scoping', label: 'Cadrage', index: 0 },
  { key: 'planning', label: 'Planification', index: 1 },
  { key: 'fieldwork', label: 'Travaux', index: 2 },
  { key: 'internal_review', label: 'Revue interne', index: 3 },
  { key: 'client_review', label: 'Validation client', index: 4 },
  { key: 'closure', label: 'Cl\u00f4ture', index: 5 },
  { key: 'action_plan', label: "Plan d'action", index: 6 },
]

export const STATUS_TO_PHASE_INDEX: Record<MissionStatus, number> = {
  initialization: 0,
  scoping: 0,
  planning: 1,
  fieldwork: 2,
  internal_review: 3,
  client_review: 4,
  closure: 5,
}

export const ASSESSMENT_STATUS_CONFIG: Record<AssessmentStatus, { label: string; variant: 'gray' | 'blue' | 'green' | 'red' }> = {
  draft: { label: 'Brouillon', variant: 'gray' },
  submitted: { label: 'Soumis', variant: 'blue' },
  in_review: { label: 'En revue', variant: 'blue' },
  approved: { label: 'Approuv\u00e9', variant: 'green' },
  rejected: { label: 'Rejet\u00e9', variant: 'red' },
}

export const GUIDED_STEPS = [
  { key: 'observer', label: 'Observer', icon: 'eye' },
  { key: 'documenter', label: 'Documenter', icon: 'paperclip' },
  { key: 'analyser', label: 'Analyser', icon: 'search' },
  { key: 'validation', label: 'Validation', icon: 'check' },
] as const

export type GuidedStepKey = typeof GUIDED_STEPS[number]['key']

export const KANBAN_COLUMNS = [
  { key: 'submitted', label: 'Soumis', color: '#3B82F6' },
  { key: 'lead_review', label: 'Revue Lead', color: '#D4A843' },
  { key: 'associate_review', label: 'Revue Associ\u00e9', color: '#40916C' },
  { key: 'client_review', label: 'Revue Client', color: '#7B68EE' },
  { key: 'validated', label: 'Valid\u00e9', color: '#27AE60' },
] as const

export type KanbanColumnKey = typeof KANBAN_COLUMNS[number]['key']

export const CONFORMITY_LEVELS = [
  { key: 'nc', label: 'Non conforme', short: 'NC' },
  { key: 'pc', label: 'Partiellement', short: 'PC' },
  { key: 'lc', label: 'Largement', short: 'LC' },
  { key: 'c', label: 'Conforme', short: 'C' },
  { key: 'na', label: 'Non applicable', short: 'N/A' },
] as const

export type ConformityLevel = typeof CONFORMITY_LEVELS[number]['key']

export const PHASE_LABELS: Record<string, string> = Object.fromEntries(
  MISSION_PHASES.map((p) => [p.key, p.label])
)

export const ROLE_LABELS: Record<string, string> = {
  associate: 'Associ\u00e9',
  lead_auditor: 'Chef de mission',
  auditor: 'Auditeur',
}
