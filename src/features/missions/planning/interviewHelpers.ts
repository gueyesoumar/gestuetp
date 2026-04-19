import type { DomainWithControls } from '../../frameworks/useFrameworkDetail'
import type { InterviewSchedule, ClientContact } from '../../../types/database.types'

/**
 * Genere un compte-rendu structure a partir des notes brutes.
 * Aligne sur les bonnes pratiques d'audit (ISA 300, ISO 19011).
 */
export function generateCompteRendu(
  interview: InterviewSchedule,
  contact: ClientContact | undefined,
  auditorName: string,
  rawNotes: string
): string {
  const date = new Date(interview.scheduled_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = interview.scheduled_time.slice(0, 5)
  const lines: string[] = []

  // Header
  lines.push('COMPTE-RENDU D\'ENTRETIEN')
  lines.push('=' .repeat(40))
  lines.push('')
  lines.push(`Date : ${date} \u00e0 ${time}`)
  lines.push(`Dur\u00e9e : ${interview.duration_minutes} minutes`)
  if (interview.location) lines.push(`Lieu : ${interview.location}`)
  lines.push(`Auditeur : ${auditorName}`)
  if (contact) lines.push(`Interlocuteur : ${contact.name}${contact.job_title ? ` (${contact.job_title})` : ''}${contact.department ? ` \u2014 ${contact.department}` : ''}`)
  lines.push('')

  // Objet
  lines.push('OBJET')
  lines.push('-'.repeat(40))
  lines.push(interview.title)
  lines.push('')

  // Analyse des notes pour structurer le CR
  const sections = parseNotesIntoSections(rawNotes)

  // Constats principaux
  lines.push('CONSTATS PRINCIPAUX')
  lines.push('-'.repeat(40))
  if (sections.findings.length > 0) {
    sections.findings.forEach((f, i) => lines.push(`${i + 1}. ${f}`))
  } else {
    lines.push('(Aucun constat identifi\u00e9 dans les notes)')
  }
  lines.push('')

  // Points positifs
  if (sections.positives.length > 0) {
    lines.push('POINTS POSITIFS')
    lines.push('-'.repeat(40))
    sections.positives.forEach((p) => lines.push(`\u2713 ${p}`))
    lines.push('')
  }

  // Points d'attention / risques
  if (sections.concerns.length > 0) {
    lines.push('POINTS D\'ATTENTION')
    lines.push('-'.repeat(40))
    sections.concerns.forEach((c) => lines.push(`\u26A0 ${c}`))
    lines.push('')
  }

  // Actions a suivre
  lines.push('ACTIONS \u00c0 SUIVRE')
  lines.push('-'.repeat(40))
  if (sections.actions.length > 0) {
    sections.actions.forEach((a, i) => lines.push(`${i + 1}. ${a}`))
  } else {
    lines.push('(Aucune action identifi\u00e9e \u2014 \u00e0 compl\u00e9ter)')
  }
  lines.push('')

  // Documents mentionnes
  if (sections.documents.length > 0) {
    lines.push('DOCUMENTS MENTIONN\u00c9S / \u00c0 COLLECTER')
    lines.push('-'.repeat(40))
    sections.documents.forEach((d) => lines.push(`\u2022 ${d}`))
    lines.push('')
  }

  // Prochaines etapes
  lines.push('PROCHAINES \u00c9TAPES')
  lines.push('-'.repeat(40))
  lines.push('\u2022 Valider ce compte-rendu avec l\'interlocuteur')
  lines.push('\u2022 Collecter les documents mentionn\u00e9s')
  lines.push('\u2022 Mettre \u00e0 jour les constats dans les contr\u00f4les concern\u00e9s')

  return lines.join('\n')
}

/**
 * Detecte automatiquement les controles concernes par l'entretien
 * en analysant les notes et le titre.
 */
export function detectControls(
  interview: InterviewSchedule,
  notes: string,
  domains: DomainWithControls[]
): string[] {
  const text = `${interview.title} ${notes}`.toLowerCase()
  const matched = new Set<string>()

  for (const domain of domains) {
    for (const control of domain.controls) {
      const score = computeMatchScore(text, control.code, control.name, control.description ?? '')
      if (score >= 2) {
        matched.add(control.id)
      }
    }
  }

  return Array.from(matched)
}

// === Internal helpers ===

interface ParsedSections {
  findings: string[]
  positives: string[]
  concerns: string[]
  actions: string[]
  documents: string[]
}

function parseNotesIntoSections(rawNotes: string): ParsedSections {
  const findings: string[] = []
  const positives: string[] = []
  const concerns: string[] = []
  const actions: string[] = []
  const documents: string[] = []

  const sentences = rawNotes
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase()

    // Documents
    if (matchesAny(lower, ['document', 'rapport', 'politique', 'proc\u00e9dure', 'charte', 'registre', 'inventaire', 'export', 'pv', 'compte-rendu', 'plan', 'matrice'])) {
      if (matchesAny(lower, ['fournir', 'transmettre', 'envoyer', 'collecter', 'manque', 'absent', 'demander'])) {
        documents.push(capitalize(sentence))
        continue
      }
    }

    // Actions
    if (matchesAny(lower, ['il faut', 'doit', 'devrait', 'pr\u00e9voir', 'planifier', '\u00e0 faire', 'action', 'mettre en place', 'am\u00e9liorer', 'corriger', 'compl\u00e9ter', 'v\u00e9rifier'])) {
      actions.push(capitalize(sentence))
      continue
    }

    // Concerns / risks
    if (matchesAny(lower, ['risque', 'probl\u00e8me', 'manque', 'absent', 'insuffisant', 'non conforme', 'pas de', 'aucun', 'retard', 'incomplet', 'vuln\u00e9rabilit\u00e9', 'critique', 'attention', 'pr\u00e9occupant'])) {
      concerns.push(capitalize(sentence))
      continue
    }

    // Positives
    if (matchesAny(lower, ['conforme', 'en place', 'formalis\u00e9', 'document\u00e9', 'r\u00e9gulier', 'efficace', 'bonne pratique', 'ok', 'valid\u00e9', 'approuv\u00e9', 'satisfaisant', 'complet', 'test\u00e9'])) {
      positives.push(capitalize(sentence))
      continue
    }

    // Default: finding
    findings.push(capitalize(sentence))
  }

  return { findings, positives, concerns, actions, documents }
}

function computeMatchScore(text: string, code: string, name: string, description: string): number {
  let score = 0

  // Direct code mention (ex: "A.5.1" in text)
  if (text.includes(code.toLowerCase())) score += 5

  // Name keywords
  const nameWords = name.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  for (const word of nameWords) {
    if (text.includes(word)) score += 1
  }

  // Description keywords
  if (description) {
    const descWords = description.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
    for (const word of descWords) {
      if (text.includes(word)) score += 0.5
    }
  }

  return score
}

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw))
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
