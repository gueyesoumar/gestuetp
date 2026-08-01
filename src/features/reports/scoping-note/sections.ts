import {
  type RGB, BG, BLUE, BORDER, FOREST_500, FOREST_50, FOREST_700, FOREST_900,
  GOLD_500, GOLD_50, ORANGE, ORANGE_50, RED, RED_50, TEXT_500, TEXT_700, TEXT_900, WHITE,
} from './colors'
import type { DocContext } from './context'
import type { MissionRisk } from '../../../types/database.types'
import { addPageNum, checkPage, drawCallout, drawH3, drawSectionBanner, drawSignatureCard, drawTable, fillRect, fillRoundedRect, setText, strokeRoundedRect, writeWrapped } from './primitives'
import {
  formatDate, generateClientPresentation, generateHypotheses, generateMissionPurpose,
  generateRiskMitigation, generateStructuralObjectives, computeMilestones,
} from './narratives'

// ── Section 01 — Préambule ─────────────────────────────────────────────────

export function drawSection01Preambule(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '01 — Préambule',
    'Contexte de la mission',
    "Présentation succincte du client, du déclencheur de l'audit et du cadre normatif applicable.",
  )

  drawH3(ctx, '1.1 Présentation du client')
  writeWrapped(ctx, generateClientPresentation(ctx.data))

  drawH3(ctx, '1.2 Cadre réglementaire et normatif')
  const regs = ctx.data.client?.exigences_reglementaires ?? []
  if (regs.length === 0) {
    writeWrapped(ctx, "Aucune réglementation particulière n'a été renseignée dans le dossier client au moment du cadrage.")
  } else {
    writeWrapped(ctx, `Le client est soumis aux ${regs.length} réglementation(s) suivante(s), identifiées dans son dossier au moment du cadrage :`)
    drawTable(ctx, ['Réglementation', 'Type', 'Impact'], regs.map((r) => [
      r.nom,
      r.type ?? '—',
      (r.impact ?? '—').toUpperCase(),
    ]))
  }

  drawH3(ctx, "1.3 Déclencheur et finalité")
  writeWrapped(ctx, generateMissionPurpose(ctx.data))
  if (ctx.data.mission.audit_objectives) {
    drawCallout(ctx, 'Objectifs énoncés (saisis lors du cadrage)', `« ${ctx.data.mission.audit_objectives} »`, 'gold')
  }
}

// ── Section 02 — Objectifs ─────────────────────────────────────────────────

export function drawSection02Objectifs(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '02 — Objectifs',
    'Que cherche-t-on à mesurer ?',
    "Texte libre du cadrage complété par des objectifs structurels générés à partir du framework et des réglementations applicables.",
  )

  drawH3(ctx, 'Objectifs structurels de la mission')
  writeWrapped(ctx, "La mission poursuit quatre objectifs principaux structurés autour du référentiel et des exigences applicables :")

  const objectives = generateStructuralObjectives(ctx.data)
  for (let i = 0; i < objectives.length; i++) {
    drawObjectiveCard(ctx, i + 1, objectives[i].title, objectives[i].description)
  }

  if (ctx.data.mission.audit_criteria) {
    drawH3(ctx, "Critères d'évaluation précisés par le sponsor")
    writeWrapped(ctx, `« ${ctx.data.mission.audit_criteria} »`, { size: 9.5 })
  }
}

function drawObjectiveCard(ctx: DocContext, num: number, title: string, desc: string): void {
  setText(ctx.doc, TEXT_500, 9, 'normal')
  const descLines = ctx.doc.splitTextToSize(desc, ctx.contentW - 22) as string[]
  const h = 12 + descLines.length * 4
  checkPage(ctx, h + 3)
  fillRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, h, 1.5, WHITE)
  strokeRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, h, 1.5, BORDER)
  // Numéro
  ctx.doc.setFillColor(...FOREST_700)
  ctx.doc.circle(ctx.marginL + 7, ctx.y + 7.5, 4, 'F')
  setText(ctx.doc, WHITE, 9, 'bold')
  ctx.doc.text(String(num), ctx.marginL + 7, ctx.y + 8.7, { align: 'center' })
  // Titre
  setText(ctx.doc, TEXT_900, 10, 'bold')
  ctx.doc.text(title, ctx.marginL + 16, ctx.y + 6)
  // Desc
  setText(ctx.doc, TEXT_500, 9, 'normal')
  let ly = ctx.y + 11
  for (const line of descLines) {
    ctx.doc.text(line, ctx.marginL + 16, ly)
    ly += 4
  }
  ctx.y += h + 3
}

// ── Section 03 — Périmètre 4D ──────────────────────────────────────────────

export function drawSection03Perimetre(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '03 — Périmètre',
    'Quatre dimensions du périmètre',
    "Périmètre fonctionnel et technique généré depuis les champs IT du dossier client, périmètre temporel depuis les dates de la mission. Détail des inclusions/exclusions issu de mission_exclusions.",
  )

  // 4 cards en grille 2×2
  const cardW = (ctx.contentW - 4) / 2
  const cardH = 38
  const startY = ctx.y
  const fwName = `${ctx.data.mission.framework?.name ?? '—'}${ctx.data.mission.framework?.version ? ' v' + ctx.data.mission.framework.version : ''}`
  drawPerimCard(ctx, ctx.marginL, startY, cardW, cardH, FOREST_700, 'Fonctionnel',
    `Intégralité du SMSI couvert par le référentiel ${fwName}, soit ${ctx.data.domains.length} domaine(s) couvrant la gouvernance et les contrôles applicables.`)
  drawPerimCard(ctx, ctx.marginL + cardW + 4, startY, cardW, cardH, GOLD_500, 'Organisationnel',
    `Évaluation portant sur ${ctx.data.client?.client_name ?? ctx.data.mission.client?.name ?? 'l\'entité cliente'}${ctx.data.client?.effectifs ? ` (${ctx.data.client.effectifs} collaborateurs)` : ''}.`)
  drawPerimCard(ctx, ctx.marginL, startY + cardH + 4, cardW, cardH, BLUE, 'Temporel',
    `Mission conduite du ${formatDate(ctx.data.mission.start_date)} au ${formatDate(ctx.data.mission.end_date)} (${ctx.durationWeeks} semaines).`)
  const techDesc = ctx.data.client?.it_systems && ctx.data.client.it_systems.length > 0
    ? `Systèmes principaux dans le périmètre : ${ctx.data.client.it_systems.slice(0, 5).join(', ')}.`
    : 'Liste détaillée des systèmes à confirmer en début de mission.'
  drawPerimCard(ctx, ctx.marginL + cardW + 4, startY + cardH + 4, cardW, cardH, FOREST_500, 'Technique', techDesc)
  ctx.y = startY + cardH * 2 + 8

  drawH3(ctx, 'Domaines et inclusion par contrôle')
  drawTable(ctx, ['Domaine', 'Libellé', 'Inclus / Total', 'Couverture'],
    ctx.data.domains.map((d) => {
      const total = d.controls.length
      const included = d.controls.filter((c) => !ctx.excludedIds.has(c.id)).length
      const pct = total > 0 ? Math.round((included / total) * 100) : 0
      return [d.code ?? '—', d.name, `${included} / ${total}`, `${pct} %`]
    }),
  )

  if (ctx.data.exclusions.length > 0) {
    drawH3(ctx, 'Exclusions documentées')
    for (const ex of ctx.data.exclusions) {
      const ctrl = ctx.data.domains
        .flatMap((d) => d.controls.map((c) => ({ ...c, domainCode: d.code })))
        .find((c) => c.id === ex.control_id)
      const ctrlLabel = ctrl ? `${ctrl.code ?? ''} ${ctrl.name ?? ''}`.trim() : 'Contrôle'
      drawCallout(ctx, ctrlLabel, `Motif : « ${ex.reason} »`, 'forest')
    }
  }
}

function drawPerimCard(ctx: DocContext, x: number, y: number, w: number, h: number, accent: RGB, title: string, text: string): void {
  fillRoundedRect(ctx.doc, x, y, w, h, 1.5, WHITE)
  strokeRoundedRect(ctx.doc, x, y, w, h, 1.5, BORDER)
  fillRect(ctx.doc, x, y, w, 1.2, accent)
  setText(ctx.doc, TEXT_900, 10, 'bold')
  ctx.doc.text(title, x + 5, y + 8)
  setText(ctx.doc, TEXT_700, 8.5, 'normal')
  const lines = ctx.doc.splitTextToSize(text, w - 10) as string[]
  let ly = y + 14
  for (const line of lines.slice(0, 6)) {
    ctx.doc.text(line, x + 5, ly)
    ly += 3.8
  }
}

// ── Section 04 — Méthodologie ──────────────────────────────────────────────

export function drawSection04Methodologie(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '04 — Méthodologie',
    "Approche d'audit basée risques",
    "Méthodologie standardisée du cabinet, identique pour toutes les missions de ce type.",
  )

  writeWrapped(ctx, "La mission s'appuie sur une démarche d'audit basée sur les risques (risk-based approach) conforme aux principes de l'ISO/IEC 27007:2020. Les contrôles sont priorisés par leur exposition au risque résiduel et leur criticité opérationnelle, selon la grille d'analyse standard du cabinet.")

  drawH3(ctx, 'Cinq phases d\'audit')
  const phases = [
    { num: '1', label: 'Cadrage', desc: 'Validation périmètre, équipe, planning.' },
    { num: '2', label: 'Prise de connaissance', desc: 'Questionnaire structuré, collecte documentaire.' },
    { num: '3', label: 'Exécution', desc: 'Entretiens, observations, revues de configuration.' },
    { num: '4', label: 'Synthèse', desc: 'Qualification écarts, plan de remédiation, restitutions.' },
    { num: '5', label: 'Livraison', desc: 'Rapport définitif et transfert du dossier d\'audit.' },
  ]
  for (const p of phases) {
    checkPage(ctx, 10)
    setText(ctx.doc, FOREST_700, 9, 'bold')
    ctx.doc.text(`${p.num}.`, ctx.marginL, ctx.y)
    setText(ctx.doc, TEXT_900, 9, 'bold')
    ctx.doc.text(p.label, ctx.marginL + 6, ctx.y)
    setText(ctx.doc, TEXT_500, 9, 'normal')
    ctx.doc.text(`— ${p.desc}`, ctx.marginL + 6 + ctx.doc.getTextWidth(p.label) + 2, ctx.y)
    ctx.y += 6
  }

  drawH3(ctx, 'Échelle de maturité — niveaux 0 à 5')
  drawTable(ctx, ['Niv.', 'Libellé', 'Critère'], [
    ['0', 'Inexistant', 'Aucun élément observable.'],
    ['1', 'Initial', 'Mise en œuvre informelle, ad hoc.'],
    ['2', 'Reproductible', 'Pratique documentée, application inégale.'],
    ['3', 'Défini', 'Procédure formalisée et déployée.'],
    ['4', 'Maîtrisé', 'Indicateurs mesurés, revues d\'efficacité.'],
    ['5', 'Optimisé', 'Amélioration continue documentée.'],
  ])
}

// ── Section 05 — Risques ───────────────────────────────────────────────────

export function drawSection05Risques(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '05 — Risques',
    'Risques initiaux identifiés',
    "Risques saisis lors du cadrage. Les recommandations sont générées automatiquement selon le niveau.",
  )

  if (ctx.data.risks.length === 0) {
    writeWrapped(ctx, "Aucun risque n'a été identifié lors du cadrage.")
    return
  }

  writeWrapped(ctx, `Au stade du cadrage, l'équipe a identifié ${ctx.data.risks.length} risque(s) significatif(s) susceptibles d'affecter la mission ou son exécution.`)

  for (const risk of ctx.data.risks) {
    drawRiskCard(ctx, risk)
  }
}

function drawRiskCard(ctx: DocContext, risk: MissionRisk): void {
  const desc = risk.description ?? '(Pas de description fournie)'
  const mitigation = generateRiskMitigation(risk.risk_level)
  setText(ctx.doc, TEXT_500, 9, 'normal')
  const descLines = ctx.doc.splitTextToSize(desc, ctx.contentW - 10) as string[]
  const mitigLines = ctx.doc.splitTextToSize(mitigation, ctx.contentW - 10) as string[]
  const h = 12 + descLines.length * 4 + 6 + mitigLines.length * 4 + 4
  checkPage(ctx, h + 3)

  const { accent, bg, label } = riskTheme(risk.risk_level)
  fillRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, h, 1.5, WHITE)
  strokeRoundedRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, h, 1.5, BORDER)
  fillRect(ctx.doc, ctx.marginL, ctx.y, 1.2, h, accent)

  // Chip + title
  drawChip(ctx, ctx.marginL + 5, ctx.y + 5.5, label, bg, accent)
  setText(ctx.doc, TEXT_900, 10, 'bold')
  ctx.doc.text(risk.title, ctx.marginL + 5 + ctx.doc.getTextWidth(label) + 12, ctx.y + 6)
  // Desc
  setText(ctx.doc, TEXT_500, 9, 'normal')
  let ly = ctx.y + 12
  for (const line of descLines) {
    ctx.doc.text(line, ctx.marginL + 5, ly)
    ly += 4
  }
  // Mitigation block
  ly += 1
  fillRoundedRect(ctx.doc, ctx.marginL + 5, ly, ctx.contentW - 10, 4 + mitigLines.length * 4 + 1, 1, BG)
  setText(ctx.doc, FOREST_700, 7.5, 'bold')
  ctx.doc.text('RECOMMANDATION INITIALE', ctx.marginL + 8, ly + 4)
  setText(ctx.doc, TEXT_700, 8.5, 'normal')
  let mly = ly + 9
  for (const line of mitigLines) {
    ctx.doc.text(line, ctx.marginL + 8, mly)
    mly += 4
  }
  ctx.y += h + 3
}

function drawChip(ctx: DocContext, x: number, y: number, label: string, bg: RGB, fg: RGB): void {
  setText(ctx.doc, fg, 7.5, 'bold')
  const w = ctx.doc.getTextWidth(label) + 5
  fillRoundedRect(ctx.doc, x, y - 3, w, 4.5, 2, bg)
  ctx.doc.text(label, x + 2.5, y)
}

function riskTheme(level: string): { accent: RGB; bg: RGB; label: string } {
  switch (level) {
    case 'critical': return { accent: RED, bg: RED_50, label: 'CRITIQUE' }
    case 'high': return { accent: ORANGE, bg: ORANGE_50, label: 'ÉLEVÉ' }
    case 'medium': return { accent: GOLD_500, bg: GOLD_50, label: 'MOYEN' }
    default: return { accent: FOREST_500, bg: FOREST_50, label: 'FAIBLE' }
  }
}

// ── Section 06 — Équipe + RACI ─────────────────────────────────────────────

export function drawSection06Equipe(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '06 — Organisation',
    'Équipe & matrice RACI',
    "Composition de l'équipe extraite des affectations mission. La matrice RACI ci-dessous est un template standard du cabinet.",
  )

  drawH3(ctx, "Équipe d'audit affectée")
  writeWrapped(ctx, `L'équipe est composée de ${ctx.data.members.length} membre(s) couvrant l'ensemble des compétences nécessaires à la mission.`)
  drawTable(ctx, ['Auditeur', 'Rôle', 'Coordonnées'],
    ctx.data.members.map((m) => [
      `${m.user.first_name} ${m.user.last_name}`,
      ctx.roleLabel(m.role),
      [m.user.email, m.user.job_title].filter(Boolean).join(' — ') || '—',
    ]),
  )

  drawH3(ctx, 'Matrice RACI standard')
  writeWrapped(ctx, "Matrice issue du modèle d'organisation du cabinet, applicable par défaut. Toute adaptation est consignée en COPIL.", { size: 9 })
  drawTable(ctx, ['Activité', 'Sponsor', 'Référent tech.', 'Chef miss.', 'Associé'], [
    ['Validation périmètre', 'A', 'C', 'R', 'I'],
    ['Mise à dispo. documentation', 'I', 'R', 'C', 'I'],
    ['Conduite des entretiens', 'I', 'C', 'R', 'I'],
    ['Qualification des écarts', 'I', 'C', 'R', 'A'],
    ['Plan de remédiation', 'I', 'R', 'C', 'I'],
    ['Validation rapport final', 'A', 'C', 'R', 'A'],
  ])
  setText(ctx.doc, TEXT_500, 8, 'normal')
  ctx.y += 2
  ctx.doc.text('R = Réalise · A = Approuve · C = Consulté · I = Informé', ctx.marginL, ctx.y)
  ctx.y += 5
}

// ── Section 07 — Planning ──────────────────────────────────────────────────

export function drawSection07Planning(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '07 — Planning',
    `${ctx.durationWeeks} semaines, 5 phases d'audit`,
    "Découpage en 5 phases proportionnelles à la durée de la mission, calculé à partir de start_date et end_date.",
  )

  writeWrapped(ctx, `La mission s'étend du ${formatDate(ctx.data.mission.start_date)} au ${formatDate(ctx.data.mission.end_date)}, soit ${ctx.durationWeeks} semaines. Le découpage standard du cabinet en cinq phases est proportionné à cette durée.`)

  drawH3(ctx, 'Vue Gantt des phases')
  drawGantt(ctx)

  drawH3(ctx, 'Jalons clés (calculés)')
  const milestones = computeMilestones(ctx.data.mission.start_date, ctx.data.mission.end_date)
  drawTable(ctx, ['#', 'Jalon', 'Date estimée'],
    milestones.map((m) => [m.code, m.label, m.date]),
  )

  setText(ctx.doc, TEXT_500, 8.5, 'normal')
  ctx.y += 2
  const note = "Les dates exactes des jalons seront confirmées en première semaine après échange avec le sponsor. Tout glissement supérieur à deux semaines sur le chemin critique fera l'objet d'un avenant."
  const noteLines = ctx.doc.splitTextToSize(note, ctx.contentW) as string[]
  for (const line of noteLines) {
    checkPage(ctx, 4)
    ctx.doc.text(line, ctx.marginL, ctx.y)
    ctx.y += 4
  }
}

function drawGantt(ctx: DocContext): void {
  const phases: { label: string; pctStart: number; pctW: number; color: RGB }[] = [
    { label: '1. Cadrage', pctStart: 0, pctW: 10, color: FOREST_500 },
    { label: '2. Prise de connaissance', pctStart: 10, pctW: 18, color: FOREST_700 },
    { label: '3. Exécution sur terrain', pctStart: 28, pctW: 35, color: FOREST_900 },
    { label: '4. Synthèse', pctStart: 63, pctW: 14, color: FOREST_700 },
    { label: '5. Livraison', pctStart: 77, pctW: 10, color: GOLD_500 },
  ]
  const labelW = 50
  const barW = ctx.contentW - labelW
  const rowH = 6
  const totalH = 8 + phases.length * rowH + 2
  checkPage(ctx, totalH)
  // Header
  fillRect(ctx.doc, ctx.marginL, ctx.y, ctx.contentW, 7, FOREST_700)
  setText(ctx.doc, WHITE, 7, 'bold')
  ctx.doc.text('PHASE', ctx.marginL + 3, ctx.y + 4.5)
  ctx.doc.text('CHRONOLOGIE', ctx.marginL + labelW + 3, ctx.y + 4.5)
  ctx.y += 8
  // Rows
  for (const p of phases) {
    setText(ctx.doc, TEXT_900, 8.5, 'bold')
    ctx.doc.text(p.label, ctx.marginL + 3, ctx.y + 4)
    // Bar zone background
    fillRect(ctx.doc, ctx.marginL + labelW, ctx.y + 1, barW, rowH - 2, BG)
    // Bar
    const barX = ctx.marginL + labelW + (p.pctStart / 100) * barW
    const barWidth = (p.pctW / 100) * barW
    fillRoundedRect(ctx.doc, barX, ctx.y + 1.5, barWidth, rowH - 3, 0.7, p.color)
    ctx.y += rowH
  }
  ctx.y += 4
}

// ── Section 08 — Livrables + gouvernance ───────────────────────────────────

export function drawSection08LivrablesGouvernance(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '08 — Livrables & gouvernance',
    'Ce que vous recevez, comment on travaille',
    "Liste de livrables et instances de pilotage standardisées au niveau cabinet.",
  )

  drawH3(ctx, 'Livrables prévus')
  const endDate = ctx.data.mission.end_date ? formatDate(ctx.data.mission.end_date) : '—'
  drawTable(ctx, ['Livrable', 'Format', 'Date prévue'], [
    ['Note de cadrage signée', 'PDF', '~ Semaine 1'],
    ['Rapport intermédiaire', 'PDF + restitution 90 min', '~ Semaine 6'],
    ['Rapport provisoire', 'PDF + restitution 60 min', '~ Semaine 10'],
    ['Rapport définitif', 'PDF + version éditable', endDate],
    ['Plan de remédiation', 'Tableur + PDF', endDate],
  ])

  drawH3(ctx, 'Instances de pilotage')
  for (const inst of [
    { label: 'COPIL hebdomadaire', desc: 'Vendredi, 45 min. Avancement, levée des points bloquants. Sponsor + référent technique + chef de mission.' },
    { label: 'Stand-up quotidien', desc: '15 min en phase d\'exécution uniquement. Chef de mission + référent technique + auditeur senior.' },
    { label: 'Revues qualité internes', desc: 'Mi-mission et avant restitution finale. Associé en charge selon référentiel cabinet.' },
  ]) {
    setText(ctx.doc, TEXT_900, 9.5, 'bold')
    checkPage(ctx, 10)
    ctx.doc.text(`• ${inst.label}`, ctx.marginL, ctx.y)
    ctx.y += 4.5
    writeWrapped(ctx, inst.desc, { size: 9, indent: 5 })
    ctx.y += 1
  }

  drawH3(ctx, "Règles d'escalade et de communication")
  writeWrapped(ctx, "Tout point bloquant non levé sous 3 jours ouvrés est porté en COPIL. Les désaccords de qualification d'un écart sont arbitrés par l'associé en charge et le sponsor en bilatéral sous 5 jours ouvrés. Les conflits d'intérêts éventuels sont déclarés sans délai au comité d'éthique du cabinet et au sponsor.")
}

// ── Section 09 — Hypothèses + limitations ──────────────────────────────────

export function drawSection09Hypotheses(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '09 — Hypothèses & limitations',
    "Ce qui doit être vrai, ce qui ne l'est pas",
    "Hypothèses générées à partir du contexte mission ; limitations standardisées.",
  )

  drawH3(ctx, 'Hypothèses retenues')
  writeWrapped(ctx, "Les hypothèses suivantes conditionnent le bon déroulement de la mission. Elles découlent du contexte client et du référentiel applicable :")
  const hyp = generateHypotheses(ctx.data)
  for (let i = 0; i < hyp.length; i++) {
    checkPage(ctx, 6)
    setText(ctx.doc, FOREST_700, 9, 'bold')
    ctx.doc.text(`H${i + 1}.`, ctx.marginL, ctx.y)
    setText(ctx.doc, TEXT_700, 9, 'normal')
    const lines = ctx.doc.splitTextToSize(hyp[i], ctx.contentW - 8) as string[]
    let ly = ctx.y
    for (const line of lines) {
      checkPage(ctx, 4)
      ctx.doc.text(line, ctx.marginL + 8, ly)
      ly += 4
    }
    ctx.y = ly + 2
  }

  drawH3(ctx, 'Conditions de réussite')
  for (const c of [
    'Engagement formel du sponsor pour la levée rapide des points bloquants en COPIL.',
    'Transparence des équipes opérationnelles dans les entretiens, garantie par la clause de confidentialité du contrat.',
    "Disponibilité d'un référent technique unique côté client sur toute la durée.",
    "Mise à disposition d'un espace de travail pour l'équipe d'audit en phase d'exécution.",
  ]) {
    checkPage(ctx, 5)
    setText(ctx.doc, FOREST_700, 9, 'bold')
    ctx.doc.text('•', ctx.marginL, ctx.y)
    setText(ctx.doc, TEXT_700, 9, 'normal')
    const lines = ctx.doc.splitTextToSize(c, ctx.contentW - 6) as string[]
    let ly = ctx.y
    for (const line of lines) {
      ctx.doc.text(line, ctx.marginL + 4, ly)
      ly += 4
    }
    ctx.y = ly + 1
  }

  drawH3(ctx, 'Limitations')
  drawCallout(
    ctx,
    'Cadre de validité',
    "L'audit n'est pas un audit de certification : il ne donne pas droit à délivrance de certificat. Périmètre limité aux contrôles inclus (cf. section 3). Conclusions à date : toute évolution ultérieure du SMSI n'est pas reflétée.",
    'gold',
  )
}

// ── Section 10 — Signatures ────────────────────────────────────────────────

export function drawSection10Signatures(ctx: DocContext): void {
  drawSectionBanner(
    ctx,
    '10 — Validation',
    'Signatures',
    "Pour bon accord sur le cadrage, le périmètre, le planning et les conditions de la mission.",
  )

  writeWrapped(ctx, "Les soussignés reconnaissent avoir pris connaissance de la présente note de cadrage et des engagements qu'elle décrit, et l'approuvent dans son intégralité.")

  ctx.y += 4
  const cardW = (ctx.contentW - 8) / 3
  const cardH = 50
  const lead = ctx.data.members.find((m) => m.role === 'lead_auditor')
  const associate = ctx.data.members.find((m) => m.role === 'associate')
  drawSignatureCard(ctx, ctx.marginL, ctx.y, cardW, cardH, 'Sponsor client', 'À désigner', 'Représentant habilité du client')
  drawSignatureCard(ctx, ctx.marginL + cardW + 4, ctx.y, cardW, cardH,
    ctx.roleLabel('lead_auditor'),
    lead ? `${lead.user.first_name} ${lead.user.last_name}` : 'À désigner',
    lead?.user.job_title ?? '—',
  )
  drawSignatureCard(ctx, ctx.marginL + (cardW + 4) * 2, ctx.y, cardW, cardH,
    ctx.roleLabel('associate'),
    associate ? `${associate.user.first_name} ${associate.user.last_name}` : 'À désigner',
    associate?.user.job_title ?? '—',
  )
  ctx.y += cardH + 6

  if (ctx.data.mission.scoping_notes) {
    drawCallout(ctx, 'Observations complémentaires', `« ${ctx.data.mission.scoping_notes} »`, 'gold')
  }

  addPageNum(ctx)
}
