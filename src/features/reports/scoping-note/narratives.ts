import type { ScopingNoteData } from './context'

export function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function generateContextSummary(data: ScopingNoteData): string {
  const fwName = data.mission.framework?.name
  const regs = data.client?.exigences_reglementaires ?? []
  const parts: string[] = []
  if (fwName) parts.push(`Mission de mise en conformité au référentiel ${fwName}.`)
  if (regs.length > 0) parts.push(`Cadre réglementaire : ${regs.slice(0, 2).map((r) => r.nom).join(', ')}.`)
  if (data.client?.client_sector) parts.push(`Secteur ${data.client.client_sector.toLowerCase()}.`)
  return parts.join(' ') || 'Mission d\'évaluation de conformité.'
}

export function generateClientPresentation(data: ScopingNoteData): string {
  const c = data.client
  const name = c?.client_name ?? data.mission.client?.name ?? 'Le client'
  const parts: string[] = [`${name} `]
  if (c?.client_sector) parts.push(`exerce une activité dans le secteur ${c.client_sector.toLowerCase()}`)
  if (c?.effectifs) parts.push(`et compte ${c.effectifs} collaborateur(s)`)
  parts.push('. ')
  if (c?.it_systems && c.it_systems.length > 0) {
    parts.push(`Son environnement SI repose sur les systèmes principaux suivants : ${c.it_systems.slice(0, 6).join(', ')}.`)
  }
  if (c?.it_environment) {
    parts.push(` Description de l'environnement IT : « ${c.it_environment} »`)
  }
  return parts.join('')
}

export function generateMissionPurpose(data: ScopingNoteData): string {
  const fwName = data.mission.framework?.name
  const fwVer = data.mission.framework?.version ? ` v${data.mission.framework.version}` : ''
  return `La présente mission est conduite dans le cadre d'une démarche de conformité au référentiel ${fwName}${fwVer}. Elle vise à évaluer la conformité du SMSI, identifier les écarts critiques, et formuler un plan de remédiation priorisé. Le périmètre est défini en section 3 et les critères d'évaluation sont précisés ci-après.`
}

export function generateStructuralObjectives(data: ScopingNoteData): { title: string; description: string }[] {
  const fwName = data.mission.framework?.name ?? 'le référentiel applicable'
  const fwVer = data.mission.framework?.version ? ` v${data.mission.framework.version}` : ''
  const regs = data.client?.exigences_reglementaires ?? []
  const totalControls = data.domains.reduce((s, d) => s + d.controls.length, 0)
  const excluded = new Set(data.exclusions.map((e) => e.control_id))
  const included = totalControls - excluded.size
  const items: { title: string; description: string }[] = []
  items.push({
    title: `Mesurer la conformité au référentiel ${fwName}${fwVer}`,
    description: `Évaluer chacun des ${included} contrôle(s) inclus dans le périmètre sur l'échelle de maturité du cabinet, avec consolidation par domaine et représentation graphique en radar dans le rapport final.`,
  })
  items.push({
    title: 'Identifier les non-conformités et les qualifier',
    description: 'Tout écart sera classé majeure (compromettant la certification), mineure (ponctuel non systémique) ou observation, selon la grille standard du cabinet.',
  })
  if (regs.length > 0) {
    const regsLabel = regs.slice(0, 3).map((r) => r.nom).join(', ')
    items.push({
      title: 'Vérifier la conformité aux réglementations applicables',
      description: `Cartographier les exigences réglementaires (${regsLabel}) contre les contrôles testés, et qualifier le respect des principes applicables.`,
    })
  }
  items.push({
    title: 'Formuler un plan de remédiation priorisé',
    description: "Tableur exécutoire avec estimation de charge par écart, jalons recommandés, dépendances inter-écarts et identification des responsables internes proposés.",
  })
  return items
}

export function generateRiskMitigation(level: string): string {
  switch (level) {
    case 'critical':
      return "Au regard du niveau critique, ce risque doit être traité prioritairement avant le démarrage de la phase d'exécution. Un plan d'action et des responsables doivent être désignés en COPIL hebdomadaire."
    case 'high':
      return "Risque à traiter activement durant la mission. Suivi en COPIL et adaptation du planning pour limiter l'exposition."
    case 'medium':
      return "Risque modéré, à surveiller. Encadrement et mesures préventives recommandés selon le contexte."
    default:
      return "Risque faible, suivi à discrétion en revue de pilotage."
  }
}

export function generateHypotheses(data: ScopingNoteData): string[] {
  const fwName = data.mission.framework?.name ?? 'le référentiel applicable'
  const regs = data.client?.exigences_reglementaires ?? []
  const sys = data.client?.it_systems ?? []
  const items: string[] = []
  items.push(`Le client met à disposition de l'équipe d'audit l'ensemble des documents identifiés dans le périmètre du référentiel ${fwName} dans les délais convenus.`)
  items.push("Les ressources internes du client (DSI, RSSI, métiers) sont mobilisées au taux de disponibilité prévu et participent activement aux entretiens planifiés.")
  if (regs.length > 0) {
    items.push(`Aucune évolution réglementaire majeure (${regs.slice(0, 2).map((r) => r.nom).join(', ')}) n'intervient pendant la durée de la mission qui modifierait substantiellement le périmètre.`)
  }
  if (sys.length > 0) {
    items.push(`Les systèmes principaux du périmètre technique (${sys.slice(0, 4).join(', ')}) restent accessibles aux auditeurs en lecture supervisée durant la phase d'exécution.`)
  }
  items.push("Aucun incident de sécurité majeur ne survient pendant la phase d'exécution, qui détournerait les équipes du suivi de la mission.")
  return items
}

export function computeMilestones(start: string | null, end: string | null): { code: string; label: string; date: string }[] {
  if (!start || !end) {
    return [
      { code: 'J0', label: 'Validation du cadrage', date: '—' },
      { code: 'J1', label: 'Clôture prise de connaissance', date: '—' },
      { code: 'J2', label: 'Restitution intermédiaire', date: '—' },
      { code: 'J3', label: 'Fin exécution terrain', date: '—' },
      { code: 'J4', label: 'Restitution finale et rapport', date: '—' },
    ]
  }
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const dur = e - s
  const at = (pct: number): string => formatDate(new Date(s + dur * pct).toISOString())
  return [
    { code: 'J0', label: 'Validation du cadrage', date: at(0.10) },
    { code: 'J1', label: 'Clôture prise de connaissance', date: at(0.28) },
    { code: 'J2', label: 'Restitution intermédiaire', date: at(0.60) },
    { code: 'J3', label: 'Fin exécution terrain', date: at(0.82) },
    { code: 'J4', label: 'Restitution finale et rapport', date: formatDate(end) },
  ]
}
