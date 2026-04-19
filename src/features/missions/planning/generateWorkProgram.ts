import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { MissionMemberRow, ControlAssignmentRow } from '../useMissionDetail'
import type { ControlPlanningInsert, AuditTechnique, RiskLevel } from '../../../types/database.types'

interface GenerateResult {
  plannings: ControlPlanningInsert[]
  assignments: { control_id: string; auditor_id: string }[]
}

// Mots-cles pour determiner le risque et les techniques
const HIGH_RISK_KEYWORDS = ['acces', 'access', 'authentification', 'chiffrement', 'crypto', 'incident', 'sauvegarde', 'backup', 'continuite', 'donnees personnelles', 'vulnerabilite']
const CRITICAL_KEYWORDS = ['politique', 'policy', 'gouvernance', 'risque', 'conformite']
const INSPECTION_KEYWORDS = ['politique', 'procedure', 'documentation', 'inventaire', 'registre', 'classification', 'plan']
const ENTRETIEN_KEYWORDS = ['responsabilite', 'role', 'organisation', 'comite', 'sensibilisation', 'formation', 'tiers', 'fournisseur']
const ECHANTILLON_KEYWORDS = ['acces', 'access', 'utilisateur', 'revue', 'journalisation', 'log', 'changement', 'patch']
const REEXECUTION_KEYWORDS = ['sauvegarde', 'backup', 'restauration', 'test', 'intrusion', 'continuite']

export function generateWorkProgram(
  missionId: string,
  domains: DomainWithControls[],
  members: MissionMemberRow[],
  _existingAssignments: ControlAssignmentRow[]
): GenerateResult {
  const auditors = members.filter((m) => m.role === 'auditor' || m.role === 'lead_auditor')
  const plannings: ControlPlanningInsert[] = []
  const assignments: { control_id: string; auditor_id: string }[] = []

  // 1. Generate planning for each control
  for (const domain of domains) {
    for (const control of domain.controls) {
      const text = `${control.name} ${control.description ?? ''}`.toLowerCase()
      const riskLevel = determineRisk(text)
      const techniques = determineTechniques(text)
      const needsSampling = techniques.includes('echantillon')

      plannings.push({
        mission_id: missionId,
        control_id: control.id,
        risk_level: riskLevel,
        audit_techniques: techniques,
        estimated_hours: 2,
        sampling_population: needsSampling ? 100 : undefined,
        sampling_size: needsSampling ? 25 : undefined,
      })
    }
  }

  // 2. Smart domain-based assignment
  if (auditors.length > 0) {
    const domainAssignments = assignByDomain(domains, auditors)
    assignments.push(...domainAssignments)
  }

  return { plannings, assignments }
}

/**
 * Repartit les controles par domaine entre les auditeurs.
 * Les gros domaines sont decoupes en blocs pour equilibrer.
 * Chaque auditeur recoit des domaines entiers (ou des blocs coherents).
 */
function assignByDomain(
  domains: DomainWithControls[],
  auditors: { user_id: string }[]
): { control_id: string; auditor_id: string }[] {
  const totalControls = domains.reduce((s, d) => s + d.controls.length, 0)
  const idealPerAuditor = Math.ceil(totalControls / auditors.length)
  const assignments: { control_id: string; auditor_id: string }[] = []

  // Split domains into chunks that fit the ideal size
  interface Chunk {
    domainCode: string
    controlIds: string[]
  }

  const chunks: Chunk[] = []

  for (const domain of domains) {
    const controlIds = domain.controls.map((c) => c.id)

    if (controlIds.length <= idealPerAuditor) {
      // Small domain — keep as one chunk
      chunks.push({ domainCode: domain.code, controlIds })
    } else {
      // Large domain — split into sub-chunks of ~idealPerAuditor size
      const subChunkSize = Math.max(5, Math.ceil(idealPerAuditor * 0.8))
      for (let i = 0; i < controlIds.length; i += subChunkSize) {
        chunks.push({
          domainCode: domain.code,
          controlIds: controlIds.slice(i, i + subChunkSize),
        })
      }
    }
  }

  // Sort chunks by size descending (assign biggest first for better balancing)
  chunks.sort((a, b) => b.controlIds.length - a.controlIds.length)

  // Track controls per auditor
  const auditorLoad = new Map<string, number>()
  for (const a of auditors) auditorLoad.set(a.user_id, 0)

  // Assign each chunk to the least loaded auditor
  for (const chunk of chunks) {
    const auditorId = getLeastLoaded(auditorLoad)
    if (!auditorId) continue

    for (const controlId of chunk.controlIds) {
      assignments.push({ control_id: controlId, auditor_id: auditorId })
    }
    auditorLoad.set(auditorId, (auditorLoad.get(auditorId) ?? 0) + chunk.controlIds.length)
  }

  return assignments
}

function determineRisk(text: string): RiskLevel {
  if (CRITICAL_KEYWORDS.some((kw) => text.includes(kw))) return 'critical'
  if (HIGH_RISK_KEYWORDS.some((kw) => text.includes(kw))) return 'high'
  return 'medium'
}

function determineTechniques(text: string): AuditTechnique[] {
  const techniques: AuditTechnique[] = []
  if (INSPECTION_KEYWORDS.some((kw) => text.includes(kw))) techniques.push('inspection')
  if (ENTRETIEN_KEYWORDS.some((kw) => text.includes(kw))) techniques.push('entretien')
  if (ECHANTILLON_KEYWORDS.some((kw) => text.includes(kw))) techniques.push('echantillon')
  if (REEXECUTION_KEYWORDS.some((kw) => text.includes(kw))) techniques.push('reexecution')
  if (techniques.length === 0) techniques.push('inspection', 'entretien')
  if (techniques.length === 1 && !techniques.includes('entretien')) techniques.push('entretien')
  return techniques
}

function getLeastLoaded(load: Map<string, number>): string | null {
  let minId: string | null = null
  let minLoad = Infinity
  for (const [id, l] of load) {
    if (l < minLoad) { minLoad = l; minId = id }
  }
  return minId
}
