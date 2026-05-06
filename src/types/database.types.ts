// Types TypeScript generés a partir du schema Supabase
// Correspond aux migrations 00001 à 00021

// ============================================================
// Enums
// ============================================================

export type MissionStatus =
  | 'initialization'
  | 'scoping'
  | 'planning'
  | 'fieldwork'
  | 'internal_review'
  | 'client_review'
  | 'closure'

export type MissionRole =
  | 'associate'
  | 'lead_auditor'
  | 'auditor'

export type AssessmentStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'

export type ValidationStage =
  | 'auditor_submitted'
  | 'lead_review'
  | 'associate_review'
  | 'client_review'

export type ValidationDecision =
  | 'approved'
  | 'rejected'

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'single_choice'
  | 'multiple_choice'
  | 'boolean'
  | 'file_upload'

export type ReportFormat = 'pdf' | 'pptx'

export type ReportStatus = 'generating' | 'ready' | 'error'

// ============================================================
// Tables plateforme
// ============================================================

export interface Organization {
  id: string
  name: string
  slug: string
  types: string[]
  parent_org_id: string | null
  logo_url: string | null
  website: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  registration_number: string | null
  sector: string | null
  description: string | null
  is_active: boolean
  /** Kill switch IA cabinet (cf. migration 00088). */
  ai_analysis_enabled?: boolean
  created_at: string
  updated_at: string
}

export interface OrganizationInsert {
  id?: string
  name: string
  slug: string
  types?: string[]
  parent_org_id?: string | null
  logo_url?: string | null
  website?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  registration_number?: string | null
  sector?: string | null
  description?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface OrganizationUpdate {
  name?: string
  slug?: string
  types?: string[]
  parent_org_id?: string | null
  logo_url?: string | null
  website?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  registration_number?: string | null
  sector?: string | null
  description?: string | null
  is_active?: boolean
}

export interface TenantConfig {
  id: string
  organization_id: string
  custom_domain: string | null
  logo_url: string | null
  primary_color: string
  secondary_color: string
  display_name: string | null
  favicon_url: string | null
  created_at: string
  updated_at: string
}

export interface TenantConfigInsert {
  id?: string
  organization_id: string
  custom_domain?: string | null
  logo_url?: string | null
  primary_color?: string
  secondary_color?: string
  display_name?: string | null
  favicon_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface TenantConfigUpdate {
  custom_domain?: string | null
  logo_url?: string | null
  primary_color?: string
  secondary_color?: string
  display_name?: string | null
  favicon_url?: string | null
}

export type UserRole = 'auditor' | 'client'

export interface User {
  id: string
  auth_id: string
  organization_id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  job_title: string | null
  is_active: boolean
  last_sign_in_at: string | null
  role: UserRole
  client_org_id: string | null
  is_platform_owner: boolean
  created_at: string
  updated_at: string
}

export interface UserInsert {
  id?: string
  auth_id: string
  organization_id: string
  email: string
  first_name: string
  last_name: string
  phone?: string | null
  avatar_url?: string | null
  job_title?: string | null
  is_active?: boolean
  last_sign_in_at?: string | null
  role?: UserRole
  client_org_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface UserUpdate {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string | null
  avatar_url?: string | null
  job_title?: string | null
  is_active?: boolean
  last_sign_in_at?: string | null
  role?: UserRole
  client_org_id?: string | null
}

// ============================================================
// Tables portail client
// ============================================================

export type PortalStatus = 'pending' | 'invited' | 'active'
export type ClientPermission = 'contributor' | 'viewer' | 'approver'
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low'
export type ActionStatus = 'open' | 'in_progress' | 'done'

export interface ClientPortalContact {
  id: string
  cabinet_client_id: string
  user_id: string | null
  contact_name: string
  email: string
  phone: string | null
  job_title: string | null
  portal_status: PortalStatus
  invited_at: string | null
  created_at: string
  updated_at: string
}

export interface ClientMissionAccess {
  id: string
  contact_id: string
  mission_id: string
  permission: ClientPermission
  granted_by: string
  granted_at: string
}

export interface ClientActionItem {
  id: string
  mission_id: string
  control_id: string | null
  assessment_id: string | null
  title: string
  description: string | null
  priority: ActionPriority
  due_date: string | null
  status: ActionStatus
  assigned_contact_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type DashboardView = 'executive' | 'pilotage' | 'operationnel'

export interface PlatformRolePermissions {
  can_create_mission: boolean
  can_assign_team: boolean
  can_be_lead: boolean
  can_designate_lead: boolean
  /** Permissions cabinet ajoutées par migration 00082 (optionnelles côté
   *  TypeScript pour les rôles legacy, traitées comme false si absentes). */
  can_delete_mission?: boolean
  can_manage_members?: boolean
  can_manage_clients?: boolean
  can_edit_organization?: boolean
  can_manage_roles?: boolean
  dashboard_views?: DashboardView[]
  default_dashboard_view?: DashboardView
  /** Permissions groupe (optionnelles, ignorées pour les cabinets classiques) */
  can_view_supervision?: boolean
  can_create_campaign?: boolean
  can_manage_subsidiaries?: boolean
  can_view_entity_detail?: boolean
}

export interface PlatformRole {
  id: string
  organization_id: string
  name: string
  description: string | null
  permissions: PlatformRolePermissions
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface PlatformRoleInsert {
  id?: string
  organization_id: string
  name: string
  description?: string | null
  permissions?: PlatformRolePermissions
  is_default?: boolean
  created_at?: string
  updated_at?: string
}

export interface PlatformRoleUpdate {
  name?: string
  description?: string | null
  permissions?: PlatformRolePermissions
  is_default?: boolean
}

export interface UserPlatformRole {
  id: string
  user_id: string
  platform_role_id: string
  assigned_by: string | null
  created_at: string
}

export interface UserPlatformRoleInsert {
  id?: string
  user_id: string
  platform_role_id: string
  assigned_by?: string | null
  created_at?: string
}

// ============================================================
// Tables referentiels
// ============================================================

export type FrameworkCategory = 'conformite' | 'gouvernance' | 'evaluation'

export interface Framework {
  id: string
  name: string
  slug: string
  description: string | null
  version: string | null
  publisher: string | null
  category: FrameworkCategory
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Domain {
  id: string
  framework_id: string
  code: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AuditChecklistItem {
  label: string
  hint?: string
  evidence_type?: 'document' | 'interview' | 'observation' | 'test'
}

export interface Control {
  id: string
  domain_id: string
  code: string
  name: string
  description: string | null
  guidance: string | null
  audit_checklist?: AuditChecklistItem[]
  // 1=very low, 5=critical. Default 3. From migration 00105.
  risk_level?: number
  sort_order: number
  created_at: string
  updated_at: string
}

export type ControlMappingRelationship = 'equivalent' | 'partial' | 'related'

export interface ControlMapping {
  id: string
  source_control_id: string
  target_control_id: string
  relationship: ControlMappingRelationship
  notes: string | null
  created_at: string
}

export type EvidenceRequestStatus =
  | 'pending'
  | 'uploaded'
  | 'declined_by_client'
  | 'accepted'
  | 'reissued'
  | 'escalated_to_finding'

export type EvidenceDeclineReason = 'inexistant' | 'non_applicable' | 'confidentialite'

export interface EvidenceCatalogItem {
  id: string
  control_id: string
  name: string
  description: string | null
  is_required: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface MissionEvidenceRequest {
  id: string
  mission_id: string
  evidence_catalog_id: string
  requested_by: string
  status: EvidenceRequestStatus
  created_at: string
  decline_reason?: EvidenceDeclineReason | null
  decline_justification?: string | null
  declined_by?: string | null
  declined_at?: string | null
  auditor_response?: string | null
  auditor_decided_by?: string | null
  auditor_decided_at?: string | null
  escalated_assessment_id?: string | null
}

export interface QuestionnaireTemplate {
  id: string
  framework_id: string
  name: string
  description: string | null
  version: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ShowIfOperator = 'equals' | 'not_equals' | 'truthy' | 'falsy'

export interface ShowIfCondition {
  question_code: string
  operator: ShowIfOperator
  value?: unknown
}

export interface Question {
  id: string
  template_id: string
  code: string
  text: string
  description: string | null
  question_type: QuestionType
  options: string[] | null
  is_required: boolean
  sort_order: number
  prefill_source?: string | null
  show_if?: ShowIfCondition | null
  created_at: string
  updated_at: string
}

// ============================================================
// Tables mission
// ============================================================

export type MissionKind = 'audit' | 'continuous_supervision'

export interface Mission {
  id: string
  cabinet_id: string
  client_id: string
  framework_id: string
  name: string
  description: string | null
  status: MissionStatus
  kind: MissionKind
  lead_auditor_id: string | null
  associate_id: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  audit_objectives: string | null
  audit_criteria: string | null
  scoping_notes: string | null
  campaign_id: string | null
  created_at: string
  updated_at: string
}

export interface MissionInsert {
  id?: string
  cabinet_id: string
  client_id: string
  framework_id: string
  name: string
  description?: string | null
  status?: MissionStatus
  kind?: MissionKind
  lead_auditor_id?: string | null
  associate_id?: string | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
  campaign_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface MissionUpdate {
  name?: string
  description?: string | null
  status?: MissionStatus
  lead_auditor_id?: string | null
  associate_id?: string | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
}

export interface MissionMember {
  id: string
  mission_id: string
  user_id: string
  role: MissionRole
  created_at: string
}

export interface MissionMemberInsert {
  id?: string
  mission_id: string
  user_id: string
  role: MissionRole
  created_at?: string
}

export interface MissionControlAssignment {
  id: string
  mission_id: string
  control_id: string
  auditor_id: string
  created_at: string
}

export interface MissionControlAssignmentInsert {
  id?: string
  mission_id: string
  control_id: string
  auditor_id: string
  created_at?: string
}

export interface ControlAssessment {
  id: string
  mission_id: string
  control_id: string
  auditor_id: string
  status: AssessmentStatus
  findings: string | null
  recommendations: string | null
  ai_draft: string | null
  evidence_notes: string | null
  observations: string | null
  risk_notes: string | null
  conformity_level: string | null
  finding_classification: string | null
  cycle_id: string | null
  created_at: string
  updated_at: string
}

export interface ControlAssessmentInsert {
  id?: string
  mission_id: string
  control_id: string
  auditor_id: string
  status?: AssessmentStatus
  findings?: string | null
  recommendations?: string | null
  ai_draft?: string | null
  evidence_notes?: string | null
  cycle_id?: string | null
  created_at?: string
  updated_at?: string
}

export type FindingClassification = 'major_nc' | 'minor_nc' | 'observation' | 'strength'
export type CARStatus = 'open' | 'client_responded' | 'verified' | 'closed'
export type CARVerification = 'pending' | 'accepted' | 'rejected'
export type AuditConclusion = 'conformant' | 'partially_conformant' | 'non_conformant'

export interface ControlAssessmentUpdate {
  status?: AssessmentStatus
  findings?: string | null
  recommendations?: string | null
  ai_draft?: string | null
  evidence_notes?: string | null
  observations?: string | null
  risk_notes?: string | null
  conformity_level?: string | null
  finding_classification?: FindingClassification | null
}

export interface CorrectiveActionRequest {
  id: string
  mission_id: string
  assessment_id: string
  code: string
  finding_classification: string
  control_code: string | null
  control_name: string | null
  description: string
  normative_reference: string | null
  deadline: string | null
  client_root_cause: string | null
  client_action: string | null
  client_responsible_id: string | null
  client_target_date: string | null
  client_proof_path: string | null
  verification_status: CARVerification
  verification_comment: string | null
  verified_by: string | null
  verified_at: string | null
  status: CARStatus
  cycle_id: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type SupervisionCycleStatus = 'planned' | 'in_progress' | 'closed'

export interface SupervisionCycle {
  id: string
  mission_id: string
  period_label: string
  period_start: string
  period_end: string
  status: SupervisionCycleStatus
  score: number | null
  conformity_summary: Record<string, unknown> | null
  lead_auditor_id: string | null
  created_by: string
  closed_by: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface SupervisionCycleInsert {
  id?: string
  mission_id: string
  period_label: string
  period_start: string
  period_end: string
  status?: SupervisionCycleStatus
  score?: number | null
  conformity_summary?: Record<string, unknown> | null
  lead_auditor_id?: string | null
  created_by: string
}

export interface AssessmentValidation {
  id: string
  assessment_id: string
  stage: ValidationStage
  decision: ValidationDecision
  comment: string | null
  validated_by: string
  created_at: string
}

export interface AssessmentValidationInsert {
  id?: string
  assessment_id: string
  stage: ValidationStage
  decision: ValidationDecision
  comment?: string | null
  validated_by: string
  created_at?: string
}

export type QuestionnaireSkipReason = 'rssi_validation' | 'no_object' | 'unknown'

export interface QuestionnaireInstance {
  id: string
  mission_id: string
  template_id: string
  snapshot: Record<string, unknown>
  due_date: string | null
  created_at: string
}

export interface QuestionnaireInstanceInsert {
  id?: string
  mission_id: string
  template_id: string
  snapshot: Record<string, unknown>
  due_date?: string | null
  created_at?: string
}

export interface QuestionnaireResponse {
  id: string
  instance_id: string
  question_code: string
  response: Record<string, unknown> | null
  responded_by: string
  skip_reason: QuestionnaireSkipReason | null
  is_prefilled: boolean
  entered_by_auditor: boolean
  created_at: string
  updated_at: string
}

export interface QuestionnaireResponseCommentRow {
  id: string
  instance_id: string
  question_code: string
  // null when the original author has been deleted (preserves audit trail)
  author_id: string | null
  parent_id: string | null
  text: string
  mentioned_user_ids: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface QuestionnaireResponseCommentInsert {
  id?: string
  instance_id: string
  question_code: string
  author_id: string
  parent_id?: string | null
  text: string
  mentioned_user_ids?: string[]
}

export interface QuestionnaireResponseCommentUpdate {
  text?: string
  mentioned_user_ids?: string[]
  deleted_at?: string | null
}

export interface QuestionnaireResponseInsert {
  id?: string
  instance_id: string
  question_code: string
  response?: Record<string, unknown> | null
  responded_by: string
  skip_reason?: QuestionnaireSkipReason | null
  is_prefilled?: boolean
  created_at?: string
  updated_at?: string
}

export interface QuestionnaireResponseUpdate {
  response?: Record<string, unknown> | null
  skip_reason?: QuestionnaireSkipReason | null
}

export interface PartieInteressee {
  nom: string
  type: 'interne' | 'externe'
  attentes: string
}

export interface ExigenceReglementaire {
  nom: string
  type: 'legale' | 'reglementaire' | 'contractuelle' | 'normative'
  description: string
  impact: 'fort' | 'moyen' | 'faible'
}

export interface CabinetClient {
  id: string
  cabinet_id: string
  client_org_id: string | null
  client_name: string
  client_email_domain: string | null
  client_registration_number: string | null
  client_sector: string | null
  client_address: string | null
  client_city: string | null
  client_country: string | null
  client_website: string | null
  client_phone: string | null
  effectifs: string | null
  chiffre_affaires: string | null
  nombre_sites: number | null
  activites_principales: string | null
  structure_hierarchique: string | null
  parties_interessees: PartieInteressee[]
  exigences_reglementaires: ExigenceReglementaire[]
  logo_url: string | null
  brand_primary_color: string | null
  brand_secondary_color: string | null
  brand_accent_color: string | null
  brand_font: string | null
  it_environment: string | null
  it_systems: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CabinetClientInsert {
  id?: string
  cabinet_id: string
  client_org_id?: string | null
  client_name: string
  client_email_domain?: string | null
  client_registration_number?: string | null
  client_sector?: string | null
  client_address?: string | null
  client_city?: string | null
  client_country?: string | null
  client_website?: string | null
  client_phone?: string | null
  effectifs?: string | null
  chiffre_affaires?: string | null
  nombre_sites?: number | null
  activites_principales?: string | null
  structure_hierarchique?: string | null
  parties_interessees?: PartieInteressee[]
  exigences_reglementaires?: ExigenceReglementaire[]
  notes?: string | null
}

export interface CabinetClientUpdate {
  client_name?: string
  client_email_domain?: string | null
  client_registration_number?: string | null
  client_sector?: string | null
  client_address?: string | null
  client_city?: string | null
  client_country?: string | null
  client_website?: string | null
  client_phone?: string | null
  effectifs?: string | null
  chiffre_affaires?: string | null
  nombre_sites?: number | null
  activites_principales?: string | null
  structure_hierarchique?: string | null
  parties_interessees?: PartieInteressee[]
  exigences_reglementaires?: ExigenceReglementaire[]
  logo_url?: string | null
  brand_primary_color?: string | null
  brand_secondary_color?: string | null
  brand_accent_color?: string | null
  brand_font?: string | null
  notes?: string | null
}

export interface SignatureEvidence {
  page: number | null
  quote: string
}

export interface DocumentSignature {
  role: string | null
  name: string | null
  signed: boolean
  date: string | null
  /** Required when signed=true (Pass 1 schema 2026+). Optional for older extractions. */
  evidence?: SignatureEvidence | null
}

export interface VersionEvidence {
  location: string
  quote: string
}

export interface DocumentAiMetadata {
  version: string | null
  /** Optional (Pass 1 schema 2026+). Where + citation supporting `version`. */
  version_evidence?: VersionEvidence | null
  last_revision_date: string | null
  signatures: DocumentSignature[]
  formality_score: number | null
  scope_declared: string | null
  key_topics: string[]
  page_count: number | null
  /** Optional: human-readable summary of what the doc covers (1-2 sentences). */
  synthesis: string | null
}

export interface Document {
  id: string
  mission_id: string
  assessment_id: string | null
  control_id: string | null
  evidence_request_id: string | null
  uploaded_by: string
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  description: string | null
  anthropic_file_id: string | null
  anthropic_file_uploaded_at: string | null
  anthropic_file_kind: 'document' | 'image' | null
  ai_metadata: DocumentAiMetadata | null
  ai_extracted_at: string | null
  ai_extract_error: string | null
  created_at: string
}

export interface DocumentInsert {
  id?: string
  mission_id: string
  assessment_id?: string | null
  control_id?: string | null
  evidence_request_id?: string | null
  uploaded_by: string
  file_name: string
  file_path: string
  file_size?: number | null
  mime_type?: string | null
  description?: string | null
  created_at?: string
}

export interface Comment {
  id: string
  mission_id: string
  assessment_id: string | null
  author_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface CommentInsert {
  id?: string
  mission_id: string
  assessment_id?: string | null
  author_id: string
  content: string
  created_at?: string
  updated_at?: string
}

export interface CommentUpdate {
  content?: string
}

export type RegulatoryType = 'legale' | 'reglementaire' | 'sectorielle' | 'normative'
export type RegulatoryJurisdiction = 'Sénégal' | 'UEMOA' | 'CEDEAO' | 'CIMA' | 'International'

export interface RegulatoryObligation {
  obligation: string
  article: string
}

export interface RegulatoryControlMapping {
  framework: string
  controls: string[]
}

export interface RegulatoryCatalogItem {
  id: string
  name: string
  short_name: string
  type: RegulatoryType
  jurisdiction: RegulatoryJurisdiction
  applicable_sectors: string[]
  description: string
  key_obligations: RegulatoryObligation[]
  penalties: string | null
  authority: string | null
  reference_url: string | null
  related_controls: RegulatoryControlMapping[]
  impact: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type NotificationType = 'submission' | 'approval' | 'rejection' | 'client_response' | 'mission_closure' | 'invitation'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export interface Report {
  id: string
  mission_id: string
  format: ReportFormat
  status: ReportStatus
  version: number
  file_path: string | null
  generated_by: string | null
  error_message: string | null
  created_at: string
}

export interface ReportInsert {
  id?: string
  mission_id: string
  format: ReportFormat
  status?: ReportStatus
  version?: number
  file_path?: string | null
  generated_by?: string | null
  error_message?: string | null
  created_at?: string
}

// ============================================================
// Scoping (migrations 00036-00039)
// ============================================================

export interface MissionExclusion {
  id: string
  mission_id: string
  control_id: string
  reason: string
  created_at: string
}

export interface MissionExclusionInsert {
  id?: string
  mission_id: string
  control_id: string
  reason: string
}

export interface MissionRisk {
  id: string
  mission_id: string
  title: string
  risk_level: RiskLevel
  description: string | null
  domain_ids: string[]
  source: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface MissionRiskInsert {
  id?: string
  mission_id: string
  title: string
  risk_level?: RiskLevel
  description?: string | null
  domain_ids?: string[]
  source?: string | null
  created_by: string
}

export interface MissionRiskUpdate {
  title?: string
  risk_level?: RiskLevel
  description?: string | null
  domain_ids?: string[]
  source?: string | null
}

export interface AuditHistoryEntry {
  id: string
  cabinet_client_id: string
  year: number
  framework_name: string
  score: number | null
  findings_count: number | null
  notes: string | null
  created_at: string
}

export interface AuditHistoryInsert {
  id?: string
  cabinet_client_id: string
  year: number
  framework_name: string
  score?: number | null
  findings_count?: number | null
  notes?: string | null
}

// ============================================================
// Planning (migrations 00033-00035)
// ============================================================

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low'
export type AuditTechnique = 'inspection' | 'entretien' | 'observation' | 'reexecution' | 'echantillon' | 'analytique'
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled'

export interface ControlPlanning {
  id: string
  mission_id: string
  control_id: string
  risk_level: RiskLevel
  audit_techniques: AuditTechnique[]
  sampling_population: number | null
  sampling_size: number | null
  estimated_hours: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ControlPlanningInsert {
  id?: string
  mission_id: string
  control_id: string
  risk_level?: RiskLevel
  audit_techniques?: AuditTechnique[]
  sampling_population?: number | null
  sampling_size?: number | null
  estimated_hours?: number
  notes?: string | null
}

export interface ControlPlanningUpdate {
  risk_level?: RiskLevel
  audit_techniques?: AuditTechnique[]
  sampling_population?: number | null
  sampling_size?: number | null
  estimated_hours?: number
  notes?: string | null
}

export interface ClientContact {
  id: string
  mission_id: string
  name: string
  job_title: string | null
  department: string | null
  email: string | null
  phone: string | null
  is_primary: boolean
  created_at: string
}

export interface ClientContactInsert {
  id?: string
  mission_id: string
  name: string
  job_title?: string | null
  department?: string | null
  email?: string | null
  phone?: string | null
  is_primary?: boolean
}

export interface ClientContactUpdate {
  name?: string
  job_title?: string | null
  department?: string | null
  email?: string | null
  phone?: string | null
  is_primary?: boolean
}

export interface InterviewSchedule {
  id: string
  mission_id: string
  contact_id: string | null
  auditor_id: string
  title: string
  scheduled_date: string
  scheduled_time: string
  duration_minutes: number
  location: string | null
  control_ids: string[]
  notes: string | null
  status: InterviewStatus
  created_at: string
  updated_at: string
}

export interface InterviewScheduleInsert {
  id?: string
  mission_id: string
  contact_id?: string | null
  auditor_id: string
  title: string
  scheduled_date: string
  scheduled_time: string
  duration_minutes?: number
  location?: string | null
  control_ids?: string[]
  notes?: string | null
  status?: InterviewStatus
}

export interface InterviewScheduleUpdate {
  contact_id?: string | null
  auditor_id?: string
  title?: string
  scheduled_date?: string
  scheduled_time?: string
  duration_minutes?: number
  location?: string | null
  control_ids?: string[]
  notes?: string | null
  status?: InterviewStatus
}

// ============================================================
// Question <-> Control link (migration 00098)
// ============================================================

export interface QuestionControlLink {
  question_id: string
  control_id: string
  weight: number
}

export interface QuestionControlLinkInsert {
  question_id: string
  control_id: string
  weight?: number
}

// ============================================================
// Assessment Findings (migration 00099, hardened by 00104)
// ============================================================
// FindingClassification is already declared above (line ~564).

export type FindingPriority = 'critical' | 'high' | 'medium' | 'low'

export interface AssessmentFinding {
  id: string
  assessment_id: string
  ord: number
  classification: FindingClassification
  description: string
  risk: string | null
  recommendation: string | null
  priority: FindingPriority | null
  proposed_deadline: string | null
  ai_generated: boolean
  created_at: string
  updated_at: string
}

export interface AssessmentFindingInsert {
  id?: string
  assessment_id: string
  ord?: number
  classification: FindingClassification
  description: string
  risk?: string | null
  recommendation?: string | null
  priority?: FindingPriority | null
  proposed_deadline?: string | null
  ai_generated?: boolean
}

export interface AssessmentFindingUpdate {
  ord?: number
  classification?: FindingClassification
  description?: string
  risk?: string | null
  recommendation?: string | null
  priority?: FindingPriority | null
  proposed_deadline?: string | null
}

// ============================================================
// Control Comments / Discussion (migration 00103, hardened by 00104)
// ============================================================

export interface ControlCommentRow {
  id: string
  mission_id: string
  control_id: string
  // null when the original author has been deleted (preserves audit trail)
  author_id: string | null
  parent_id: string | null
  text: string
  mentioned_user_ids: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ControlCommentInsert {
  id?: string
  mission_id: string
  control_id: string
  author_id: string
  parent_id?: string | null
  text: string
  mentioned_user_ids?: string[]
}

export interface ControlCommentUpdate {
  text?: string
  mentioned_user_ids?: string[]
  deleted_at?: string | null
}

// ============================================================
// Audit topics — meta-themes regroupant N controles d'un referentiel
// (ex: "Gestion des acces" couvre A.5.15-18, A.8.2, A.8.3, A.8.5).
// framework_id non null = template plateforme, mission_id non null = custom mission.
// ============================================================

export interface AuditTopic {
  id: string
  framework_id: string | null
  mission_id: string | null
  name: string
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface AuditTopicInsert {
  id?: string
  framework_id?: string | null
  mission_id?: string | null
  name: string
  description?: string | null
  is_active?: boolean
  sort_order?: number
}

export interface AuditTopicUpdate {
  name?: string
  description?: string | null
  is_active?: boolean
  sort_order?: number
}

export interface TopicControlLink {
  topic_id: string
  control_id: string
}

export interface TopicControlLinkInsert {
  topic_id: string
  control_id: string
}

// ============================================================
// Database type (pour Supabase client type)
// ============================================================

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: OrganizationInsert
        Update: OrganizationUpdate
      }
      tenant_configs: {
        Row: TenantConfig
        Insert: TenantConfigInsert
        Update: TenantConfigUpdate
      }
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      platform_roles: {
        Row: PlatformRole
        Insert: PlatformRoleInsert
        Update: PlatformRoleUpdate
      }
      user_platform_roles: {
        Row: UserPlatformRole
        Insert: UserPlatformRoleInsert
        Update: never
      }
      frameworks: {
        Row: Framework
        Insert: never
        Update: never
      }
      domains: {
        Row: Domain
        Insert: never
        Update: never
      }
      controls: {
        Row: Control
        Insert: never
        Update: never
      }
      questionnaire_templates: {
        Row: QuestionnaireTemplate
        Insert: never
        Update: never
      }
      questions: {
        Row: Question
        Insert: never
        Update: never
      }
      control_mappings: {
        Row: ControlMapping
        Insert: never
        Update: never
      }
      cabinet_clients: {
        Row: CabinetClient
        Insert: CabinetClientInsert
        Update: CabinetClientUpdate
      }
      evidence_catalog: {
        Row: EvidenceCatalogItem
        Insert: never
        Update: never
      }
      mission_evidence_requests: {
        Row: MissionEvidenceRequest
        Insert: never
        Update: never
      }
      missions: {
        Row: Mission
        Insert: MissionInsert
        Update: MissionUpdate
      }
      mission_members: {
        Row: MissionMember
        Insert: MissionMemberInsert
        Update: never
      }
      mission_control_assignments: {
        Row: MissionControlAssignment
        Insert: MissionControlAssignmentInsert
        Update: never
      }
      control_assessments: {
        Row: ControlAssessment
        Insert: ControlAssessmentInsert
        Update: ControlAssessmentUpdate
      }
      assessment_validations: {
        Row: AssessmentValidation
        Insert: AssessmentValidationInsert
        Update: never
      }
      questionnaire_instances: {
        Row: QuestionnaireInstance
        Insert: QuestionnaireInstanceInsert
        Update: never
      }
      questionnaire_responses: {
        Row: QuestionnaireResponse
        Insert: QuestionnaireResponseInsert
        Update: QuestionnaireResponseUpdate
      }
      documents: {
        Row: Document
        Insert: DocumentInsert
        Update: never
      }
      comments: {
        Row: Comment
        Insert: CommentInsert
        Update: CommentUpdate
      }
      reports: {
        Row: Report
        Insert: ReportInsert
        Update: never
      }
      notifications: {
        Row: Notification
        Insert: never
        Update: never
      }
      regulatory_catalog: {
        Row: RegulatoryCatalogItem
        Insert: never
        Update: never
      }
      control_planning: {
        Row: ControlPlanning
        Insert: ControlPlanningInsert
        Update: ControlPlanningUpdate
      }
      client_contacts: {
        Row: ClientContact
        Insert: ClientContactInsert
        Update: ClientContactUpdate
      }
      interview_schedules: {
        Row: InterviewSchedule
        Insert: InterviewScheduleInsert
        Update: InterviewScheduleUpdate
      }
      mission_exclusions: {
        Row: MissionExclusion
        Insert: MissionExclusionInsert
        Update: never
      }
      mission_risks: {
        Row: MissionRisk
        Insert: MissionRiskInsert
        Update: MissionRiskUpdate
      }
      audit_history: {
        Row: AuditHistoryEntry
        Insert: AuditHistoryInsert
        Update: never
      }
      question_controls: {
        Row: QuestionControlLink
        Insert: QuestionControlLinkInsert
        Update: never
      }
      assessment_findings: {
        Row: AssessmentFinding
        Insert: AssessmentFindingInsert
        Update: AssessmentFindingUpdate
      }
      control_comments: {
        Row: ControlCommentRow
        Insert: ControlCommentInsert
        Update: ControlCommentUpdate
      }
      questionnaire_response_comments: {
        Row: QuestionnaireResponseCommentRow
        Insert: QuestionnaireResponseCommentInsert
        Update: QuestionnaireResponseCommentUpdate
      }
      audit_topics: {
        Row: AuditTopic
        Insert: AuditTopicInsert
        Update: AuditTopicUpdate
      }
      topic_controls: {
        Row: TopicControlLink
        Insert: TopicControlLinkInsert
        Update: never
      }
    }
    Enums: {
      mission_status: MissionStatus
      mission_role: MissionRole
      assessment_status: AssessmentStatus
      validation_stage: ValidationStage
      validation_decision: ValidationDecision
      report_format: ReportFormat
      report_status: ReportStatus
      risk_level: RiskLevel
      audit_technique: AuditTechnique
      interview_status: InterviewStatus
      campaign_status: CampaignStatus
      observation_response_action: ObservationResponseAction
    }
  }
}

// ============================================================
// Assessment Observations (migration 00061)
// ============================================================

export type ObservationResponseAction = 'modified' | 'kept'

export interface AssessmentObservation {
  id: string
  assessment_id: string
  observation_text: string
  observation_by: string
  observation_at: string
  response_text: string | null
  response_action: ObservationResponseAction | null
  response_by: string | null
  response_at: string | null
  created_at: string
  updated_at: string
}

export interface AssessmentObservationInsert {
  id?: string
  assessment_id: string
  observation_text: string
  observation_by: string
}

export interface AssessmentObservationUpdate {
  response_text?: string
  response_action?: ObservationResponseAction
  response_by?: string
  response_at?: string
}

// ============================================================
// Mission Evidence Overrides (migration 00062)
// ============================================================

export interface MissionEvidenceOverride {
  id: string
  mission_id: string
  evidence_name: string
  is_essential: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MissionEvidenceOverrideInsert {
  id?: string
  mission_id: string
  evidence_name: string
  is_essential: boolean
  created_by?: string | null
}

// ============================================================
// Audit Campaigns (migration 00059)
// ============================================================

export type CampaignStatus = 'draft' | 'active' | 'completed'

export interface AuditCampaign {
  id: string
  organization_id: string
  framework_id: string
  name: string
  period_label: string
  period_start: string
  period_end: string
  status: CampaignStatus
  created_at: string
}

export interface AuditCampaignInsert {
  id?: string
  organization_id: string
  framework_id: string
  name: string
  period_label: string
  period_start: string
  period_end: string
  status?: CampaignStatus
}

export interface AuditCampaignUpdate {
  name?: string
  period_label?: string
  period_start?: string
  period_end?: string
  status?: CampaignStatus
}
