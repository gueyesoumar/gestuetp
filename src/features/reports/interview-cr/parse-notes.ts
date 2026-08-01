// Notes parser (same logic as interviewHelpers but returns arrays)
export interface Sections { findings: string[]; positives: string[]; concerns: string[]; actions: string[]; documents: string[] }

export function parseNotes(raw: string): Sections {
  const findings: string[] = []
  const positives: string[] = []
  const concerns: string[] = []
  const actions: string[] = []
  const documents: string[] = []

  const sentences = raw.split(/[.\n]/).map((s) => s.trim()).filter((s) => s.length > 10)

  for (const s of sentences) {
    const l = s.toLowerCase()
    if (has(l, ['document', 'rapport', 'politique', 'charte', 'registre', 'inventaire', 'plan', 'matrice']) && has(l, ['fournir', 'transmettre', 'envoyer', 'manque', 'absent', 'demander', 'collecter'])) { documents.push(cap(s)); continue }
    if (has(l, ['il faut', 'doit', 'devrait', 'prévoir', 'planifier', 'à faire', 'action', 'mettre en place', 'améliorer', 'corriger', 'compléter'])) { actions.push(cap(s)); continue }
    if (has(l, ['risque', 'problème', 'manque', 'absent', 'insuffisant', 'non conforme', 'pas de', 'aucun', 'retard', 'incomplet', 'critique', 'attention'])) { concerns.push(cap(s)); continue }
    if (has(l, ['conforme', 'en place', 'formalisé', 'documenté', 'régulier', 'efficace', 'validé', 'approuvé', 'satisfaisant', 'complet', 'testé'])) { positives.push(cap(s)); continue }
    findings.push(cap(s))
  }

  return { findings, positives, concerns, actions, documents }
}

function has(t: string, kw: string[]): boolean { return kw.some((k) => t.includes(k)) }
function cap(s: string): string { return s.charAt(0).toUpperCase() + s.slice(1) }
