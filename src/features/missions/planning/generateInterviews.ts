import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { ControlAssignmentRow } from '../useMissionDetail'
import type { ControlPlanning, ClientContact, InterviewScheduleInsert } from '../../../types/database.types'

/**
 * Genere automatiquement les entretiens a partir du programme de travail.
 * Logique :
 * 1. Filtrer les controles qui ont "entretien" dans leurs techniques
 * 2. Grouper par domaine + auditeur affecte
 * 3. Creer un entretien par groupe
 * 4. Repartir les dates sur la timeline de la mission
 * 5. Suggerer un contact client par domaine
 */

// Mapping domaine → interlocuteur probable
const DOMAIN_CONTACT_HINTS: Record<string, { role: string; keywords: string[] }> = {
  // Governance / Policy
  'politique': { role: 'RSSI', keywords: ['rssi', 'securite', 'ciso', 'security'] },
  'gouvernance': { role: 'RSSI', keywords: ['rssi', 'securite', 'ciso'] },
  'organisation': { role: 'RSSI', keywords: ['rssi', 'dsi', 'securite'] },
  // HR
  'ressources humaines': { role: 'DRH', keywords: ['drh', 'rh', 'ressources', 'humaines'] },
  'sensibilisation': { role: 'DRH', keywords: ['drh', 'rh', 'formation'] },
  // IT / Assets
  'actif': { role: 'DSI', keywords: ['dsi', 'it', 'systeme', 'informatique'] },
  'inventaire': { role: 'DSI', keywords: ['dsi', 'it', 'cmdb'] },
  // Access
  'acc\u00e8s': { role: 'Admin sys', keywords: ['admin', 'syst\u00e8me', 'iam', 'identit\u00e9'] },
  'acces': { role: 'Admin sys', keywords: ['admin', 'syst\u00e8me', 'iam'] },
  'authentification': { role: 'Admin sys', keywords: ['admin', 'syst\u00e8me'] },
  // Crypto / Network
  'crypto': { role: 'RSSI', keywords: ['rssi', 'securite'] },
  'chiffrement': { role: 'RSSI', keywords: ['rssi', 'securite'] },
  'r\u00e9seau': { role: 'Admin r\u00e9seau', keywords: ['r\u00e9seau', 'network', 'infra'] },
  // Continuity
  'continuit\u00e9': { role: 'DSI', keywords: ['dsi', 'continuit\u00e9', 'pca'] },
  'sauvegarde': { role: 'DSI', keywords: ['dsi', 'backup', 'it'] },
  // Default
  'incident': { role: 'RSSI', keywords: ['rssi', 'securite', 'soc'] },
}

interface InterviewGroup {
  domainCode: string
  domainName: string
  controlIds: string[]
  controlCodes: string[]
  auditorId: string
  suggestedRole: string
}

export function generateInterviewPlan(
  missionId: string,
  domains: DomainWithControls[],
  plannings: ControlPlanning[],
  assignments: ControlAssignmentRow[],
  contacts: ClientContact[],
  startDate: string | null,
  endDate: string | null
): InterviewScheduleInsert[] {
  const planMap = new Map(plannings.map((p) => [p.control_id, p]))
  const assignMap = new Map(assignments.map((a) => [a.control_id, a]))

  // 1. Find controls that need interviews
  const interviewControls: { controlId: string; controlCode: string; domainCode: string; domainName: string; auditorId: string }[] = []

  for (const domain of domains) {
    for (const control of domain.controls) {
      const plan = planMap.get(control.id)
      const assignment = assignMap.get(control.id)
      if (!assignment) continue

      const techniques = plan?.audit_techniques ?? []
      const hasInterview = techniques.includes('entretien')
      if (!hasInterview) continue

      interviewControls.push({
        controlId: control.id,
        controlCode: control.code,
        domainCode: domain.code,
        domainName: domain.name,
        auditorId: assignment.auditor_id,
      })
    }
  }

  // 2. Group by domain + auditor
  const groupKey = (c: typeof interviewControls[0]) => `${c.domainCode}::${c.auditorId}`
  const groups = new Map<string, InterviewGroup>()

  for (const ctrl of interviewControls) {
    const key = groupKey(ctrl)
    if (!groups.has(key)) {
      groups.set(key, {
        domainCode: ctrl.domainCode,
        domainName: ctrl.domainName,
        controlIds: [],
        controlCodes: [],
        auditorId: ctrl.auditorId,
        suggestedRole: suggestContactRole(ctrl.domainName),
      })
    }
    const group = groups.get(key)!
    group.controlIds.push(ctrl.controlId)
    group.controlCodes.push(ctrl.controlCode)
  }

  // 3. Split large groups (>8 controls = 2 entretiens)
  const finalGroups: InterviewGroup[] = []
  for (const group of groups.values()) {
    if (group.controlIds.length > 8) {
      const mid = Math.ceil(group.controlIds.length / 2)
      finalGroups.push({
        ...group,
        controlIds: group.controlIds.slice(0, mid),
        controlCodes: group.controlCodes.slice(0, mid),
      })
      finalGroups.push({
        ...group,
        controlIds: group.controlIds.slice(mid),
        controlCodes: group.controlCodes.slice(mid),
      })
    } else {
      finalGroups.push(group)
    }
  }

  // 4. Generate dates spread over mission timeline
  const dates = generateDates(startDate, endDate, finalGroups.length)

  // 5. Match contacts
  const contactMap = new Map<string, ClientContact>()
  for (const c of contacts) {
    const key = (c.job_title ?? '').toLowerCase()
    contactMap.set(key, c)
  }

  // 6. Create interview entries
  return finalGroups.map((group, i) => {
    const contact = findBestContact(group.suggestedRole, contacts)
    const controlCount = group.controlIds.length
    const duration = Math.min(180, Math.max(30, Math.ceil(controlCount / 5) * 60))

    const title = buildTitle(group.domainCode, group.domainName, group.controlCodes)

    return {
      mission_id: missionId,
      auditor_id: group.auditorId,
      contact_id: contact?.id ?? undefined,
      title,
      scheduled_date: dates[i],
      scheduled_time: i % 2 === 0 ? '09:00:00' : '14:00:00',
      duration_minutes: duration,
      control_ids: group.controlIds,
      notes: `Contr\u00f4les couverts : ${group.controlCodes.join(', ')}${contact ? `\nInterlocuteur sugg\u00e9r\u00e9 : ${contact.name} (${contact.job_title ?? group.suggestedRole})` : `\nInterlocuteur sugg\u00e9r\u00e9 : ${group.suggestedRole}`}`,
      status: 'scheduled' as const,
    }
  })
}

function suggestContactRole(domainName: string): string {
  const lower = domainName.toLowerCase()
  for (const [keyword, hint] of Object.entries(DOMAIN_CONTACT_HINTS)) {
    if (lower.includes(keyword)) return hint.role
  }
  return 'RSSI'
}

function findBestContact(suggestedRole: string, contacts: ClientContact[]): ClientContact | null {
  if (contacts.length === 0) return null
  const roleLower = suggestedRole.toLowerCase()

  // Try exact match on job_title
  for (const c of contacts) {
    const title = (c.job_title ?? '').toLowerCase()
    if (title.includes(roleLower) || roleLower.includes(title)) return c
  }

  // Try department
  for (const c of contacts) {
    const dept = (c.department ?? '').toLowerCase()
    if (dept.includes(roleLower)) return c
  }

  // Fallback: primary contact
  const primary = contacts.find((c) => c.is_primary)
  return primary ?? contacts[0]
}

function generateDates(start: string | null, end: string | null, count: number): string[] {
  const startDate = start ? new Date(start) : new Date()
  const endDate = end ? new Date(end) : new Date(startDate.getTime() + 30 * 86400000)

  // Start interviews after ~20% of the mission (cadrage first)
  const missionDays = Math.max(7, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000))
  const interviewStart = new Date(startDate.getTime() + missionDays * 0.2 * 86400000)
  const interviewEnd = new Date(startDate.getTime() + missionDays * 0.7 * 86400000)
  const interviewDays = Math.max(5, Math.ceil((interviewEnd.getTime() - interviewStart.getTime()) / 86400000))

  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.round((i / Math.max(1, count - 1)) * interviewDays)
    const date = new Date(interviewStart.getTime() + dayOffset * 86400000)

    // Skip weekends
    const dow = date.getDay()
    if (dow === 0) date.setDate(date.getDate() + 1)
    if (dow === 6) date.setDate(date.getDate() + 2)

    dates.push(date.toISOString().slice(0, 10))
  }

  return dates
}

function buildTitle(domainCode: string, domainName: string, codes: string[]): string {
  const shortName = domainName.length > 40 ? domainName.slice(0, 40) + '...' : domainName
  if (codes.length <= 3) {
    return `${domainCode} \u2014 ${shortName}`
  }
  return `${domainCode} \u2014 ${shortName} (${codes.length} ctrl)`
}
