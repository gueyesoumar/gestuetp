/**
 * Génération de texte intelligent pour le rapport d'audit V2.
 *
 * Toutes les fonctions sont pures et déterministes : elles transforment
 * les données réelles de la mission en prose calibrée audit. Aucune
 * boilerplate générique : chaque paragraphe consomme au moins une donnée
 * pour rester pertinent.
 */

import type { AuditReportData, DomainStat, AssessmentWithControl } from './generateAuditReportPDF'

// ── Extraction de contrôles spécifiques ───────────────────────────────────

/**
 * Renvoie les N premiers contrôles strictement conformes (level=c), triés
 * par code de contrôle pour stabilité. Optionnellement filtré par domaine.
 */
function topConformingControls(data: AuditReportData, n = 3, domainCode?: string): AssessmentWithControl[] {
  let pool = data.assessments.filter((a) => a.conformity_level === 'c')
  if (domainCode) {
    const dom = data.domains.find((d) => d.code === domainCode)
    if (!dom) return []
    const ids = new Set(dom.controls.map((c) => c.id))
    pool = pool.filter((a) => ids.has(a.control_id))
  }
  return pool.sort((a, b) => a.control.code.localeCompare(b.control.code)).slice(0, n)
}

/**
 * Renvoie les N premiers contrôles avec écart, NC majeures > NC mineures > obs,
 * triés par code à priorité égale. Optionnellement scoped par domaine.
 */
function topWeakControls(data: AuditReportData, n = 3, domainCode?: string): AssessmentWithControl[] {
  const order = (a: AssessmentWithControl): number =>
    a.finding_classification === 'major_nc' ? 0
    : a.finding_classification === 'minor_nc' ? 1
    : a.finding_classification === 'observation' ? 2
    : 3
  let pool = data.assessments.filter((a) =>
    a.finding_classification === 'major_nc'
    || a.finding_classification === 'minor_nc'
    || a.finding_classification === 'observation'
  )
  if (domainCode) {
    const dom = data.domains.find((d) => d.code === domainCode)
    if (!dom) return []
    const ids = new Set(dom.controls.map((c) => c.id))
    pool = pool.filter((a) => ids.has(a.control_id))
  }
  return pool.sort((a, b) => order(a) - order(b) || a.control.code.localeCompare(b.control.code)).slice(0, n)
}

/** Liste lisible : "A.5.1 Politiques…, A.7.2 Contrôles physiques…, A.8.7 Anti-malware". */
function listControls(items: AssessmentWithControl[], maxNameLen = 40): string {
  if (items.length === 0) return ''
  const names = items.map((a) => `${a.control.code} (${truncateName(a.control.name, maxNameLen)})`)
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} et ${names[1]}`
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}

function truncateName(s: string, max: number): string {
  return s.length <= max ? s.toLowerCase().charAt(0) + s.slice(1) : s.slice(0, max - 1).toLowerCase().charAt(0) + s.slice(1, max - 1) + '…'
}


// ── Verdict & qualifiers ──────────────────────────────────────────────────

export interface VerdictDescriptor {
  label: 'Favorable' | 'Favorable avec réserves' | 'Réservée' | 'Défavorable'
  short: string
  qualifier: string
  toneOpening: string
}

export function describeVerdict(score: number, ncMajor: number): VerdictDescriptor {
  if (ncMajor === 0 && score >= 85) {
    return {
      label: 'Favorable',
      short: 'favorable',
      qualifier: 'satisfaisante',
      toneOpening: 'L\'audit conclut à une conformité globale satisfaisante au regard des exigences du référentiel.',
    }
  }
  if (ncMajor === 0 && score >= 70) {
    return {
      label: 'Favorable avec réserves',
      short: 'favorable avec réserves',
      qualifier: 'majoritairement conforme',
      toneOpening: 'L\'audit conclut à une conformité majoritairement satisfaisante, sous réserve de la prise en compte des observations formulées.',
    }
  }
  if (ncMajor <= 2 && score >= 55) {
    return {
      label: 'Réservée',
      short: 'réservée',
      qualifier: 'partiellement conforme',
      toneOpening: 'L\'audit conclut à une conformité partielle nécessitant la mise en œuvre d\'un plan d\'action de remédiation sur les écarts identifiés.',
    }
  }
  return {
    label: 'Défavorable',
    short: 'défavorable',
    qualifier: 'insuffisante',
    toneOpening: 'L\'audit conclut à une conformité insuffisante au regard des exigences du référentiel et appelle un plan de remédiation prioritaire.',
  }
}

// ── 01. Contexte de l'audit ───────────────────────────────────────────────

export function generateContextNarrative(data: AuditReportData): string[] {
  const fw = frameworkLabel(data)
  const sector = data.client?.sector ?? 'son secteur d\'activité'
  const auditPurpose = inferAuditPurpose(data.mission.description ?? '')
  const period = formatPeriod(data.mission.start_date, data.mission.end_date)
  const duration = computeDuration(data.mission.start_date, data.mission.end_date)
  const totalControls = data.totals.totalControls
  const lead = memberFullName(data, 'lead_auditor') ?? 'le chef de mission désigné'
  const associate = memberFullName(data, 'associate')
  const clientName = clientLabel(data)

  const teamSentence = associate
    ? `Les travaux ont mobilisé une équipe pluridisciplinaire placée sous la responsabilité de ${associate} en qualité d'associé signataire, et de ${lead} en qualité de chef de mission.`
    : `Les travaux ont mobilisé une équipe d'audit placée sous la responsabilité de ${lead} en qualité de chef de mission.`

  return [
    `L'audit faisant l'objet du présent rapport s'inscrit dans la démarche de conformité de ${clientName} aux exigences du référentiel ${fw}. Ce référentiel constitue, dans ${sector}, l'une des références normatives les plus structurantes en matière de sécurité et de gouvernance des systèmes d'information. Toute organisation revendiquant la conformité à ${fw} est tenue de démontrer, de façon documentée et auditable, l'existence et l'efficacité opérationnelle du dispositif de contrôle interne associé.`,
    `Dans ce contexte, ${data.cabinetName} a été mandaté par ${clientName} pour conduire ${auditPurpose}. Cette intervention répond à un besoin d'évaluation objective et indépendante du niveau de maîtrise atteint par l'organisation, ainsi qu'à l'identification structurée des écarts résiduels susceptibles de compromettre la délivrance ou le maintien d'une attestation de conformité.`,
    `L'audit a été conduit sur la période du ${period}, soit une durée d'intervention de ${duration}. Il a couvert l'ensemble des ${totalControls} contrôles formant le cadre de référence ${fw}, sans exclusion notable du périmètre. ${teamSentence} La méthodologie d'intervention, détaillée en section 2, est conforme aux standards de la profession et aux bonnes pratiques d'audit interne reconnues.`,
    `Le présent rapport constitue le livrable terminal de la mission. Il a vocation à informer la direction générale de ${clientName} des conclusions de l'audit, à servir de support de communication aux instances de gouvernance et de comité d'audit, et à fonder le plan d'actions de remédiation. Conformément aux principes déontologiques de notre profession, sa diffusion est strictement restreinte à la liste de destinataires figurant en Annexe D. Toute reproduction, communication ou exploitation en dehors de ce périmètre nécessite l'accord préalable et écrit de ${data.cabinetName}.`,
  ]
}

// ── 02. Méthodologie ──────────────────────────────────────────────────────

export function generateMethodologyNarrative(data: AuditReportData): string[] {
  return [
    `La mission a été conduite conformément aux normes professionnelles d'audit applicables, et en cohérence avec les principes énoncés par la norme ISO 19011:2018 « Lignes directrices pour l'audit des systèmes de management ». Notre approche s'inscrit dans une logique d'évaluation par les processus et par les preuves, à la croisée de l'audit de conformité (recherche d'écarts au référentiel) et de l'audit de performance (appréciation de l'efficacité opérationnelle des dispositifs).`,
    `La phase de préparation a donné lieu à l'élaboration d'un mémo de planification définissant les objectifs détaillés, le périmètre, le calendrier, l'équipe mobilisée et la stratégie d'échantillonnage. La sélection des contrôles a été opérée selon une approche par les risques : les contrôles à enjeu majeur (gouvernance, gestion des accès, continuité, gestion des fournisseurs critiques, sécurité du développement) ont fait l'objet de tests approfondis, tandis que les contrôles à faible criticité ont été couverts par revue documentaire ciblée.`,
    `Quatre techniques d'audit complémentaires ont été mobilisées sur la mission : (i) la revue documentaire des politiques, procédures, comptes-rendus de comités, journaux d'événements et enregistrements de contrôle ; (ii) la conduite d'entretiens semi-directifs avec les responsables de processus et les opérationnels concernés ; (iii) l'observation directe des dispositifs et des configurations en environnement de test ou de production ; (iv) la re-performance, lorsque pertinent, d'un échantillon de contrôles automatisés ou manuels afin d'apprécier leur efficacité réelle. Chaque test conduit a fait l'objet d'une fiche de travail (workpaper) tracée et archivée.`,
    `Le seuil de matérialité retenu pour la qualification des écarts s'inscrit dans le cadre suivant : (i) une non-conformité majeure (NC majeure) caractérise un manquement substantiel à une exigence du référentiel, susceptible de compromettre l'atteinte des objectifs du système de management ou de remettre en cause la délivrance / le maintien d'une attestation ; (ii) une non-conformité mineure (NC mineure) caractérise un écart ponctuel ou d'application incomplète, n'affectant pas la capacité d'ensemble du dispositif ; (iii) une observation correspond à une opportunité d'amélioration sans qualification d'écart formel.`,
    `L'ensemble des constats a été restitué de manière contradictoire au cours d'une réunion de clôture, permettant à ${data.client?.name ?? 'l\'entité auditée'} de prendre position sur chacun d'eux avant rédaction du présent rapport. Les recommandations formulées en section 6 visent à proposer des pistes de remédiation pragmatiques, dimensionnées au regard de l'organisation et de ses ressources, et hiérarchisées selon une logique impact × effort. Le suivi de leur mise en œuvre est ouvert sur la plateforme via les demandes d'action corrective (CAR) attachées à chaque écart.`,
  ]
}

// ── 03. Synthèse exécutive ────────────────────────────────────────────────

export function generateExecutiveNarrative(data: AuditReportData): string[] {
  const t = data.totals
  const verdict = describeVerdict(t.conformityScore, t.ncMajor)
  const fw = frameworkLabel(data)

  // Points forts et points faibles concrets, basés sur les contrôles réels
  const strengths = topConformingControls(data, 4)
  const majors = topWeakControls(data, 4).filter((a) => a.finding_classification === 'major_nc')
  const minorsAndObs = topWeakControls(data, 6).filter((a) => a.finding_classification !== 'major_nc')

  // Paragraphe « points forts » : nomme les contrôles maîtrisés
  const strengthsClause = strengths.length > 0
    ? `Parmi les dispositifs maîtrisés au cours de l'audit figurent notamment ${listControls(strengths)}, qui témoignent d'une appropriation aboutie des exigences correspondantes.`
    : ``

  // Paragraphe « axes de progrès » : nomme les NC majeures + autres écarts
  const majorClause = majors.length > 0
    ? `Les non-conformités majeures portent en particulier sur ${listControls(majors)}.`
    : `Aucune non-conformité majeure n'a été caractérisée.`
  const minorClause = minorsAndObs.length > 0
    ? `Les écarts résiduels (NC mineures et observations) concernent notamment ${listControls(minorsAndObs.slice(0, 4))}.`
    : ``

  return [
    `${verdict.toneOpening} Au terme de l'évaluation des ${t.totalControls} contrôles du référentiel ${fw}, ${clientLabel(data)} obtient un score de conformité pondéré de ${t.conformityScore}%.`,
    `Sur les ${t.totalControls} contrôles évalués, ${t.conformes} ont été jugés strictement conformes, ${t.largement} largement conformes, ${t.partiels} partiellement conformes et ${t.nonConformes} non conformes. ${t.ncMajor} non-conformités majeures et ${t.ncMinor} non-conformités mineures ont été formellement caractérisées, complétées par ${t.observations} observations constituant des opportunités d'amélioration. Le détail individuel des non-conformités majeures est restitué en section 5 sous forme de fiches normalisées.`,
    `${strengthsClause ? strengthsClause + ' ' : ''}${majorClause}${minorClause ? ' ' + minorClause : ''} L'analyse détaillée par domaine, restituée en section 4, distingue les dispositifs maîtrisés de ceux nécessitant un renforcement.`,
    `Au regard de l'ensemble des constats, l'opinion d'audit retenue est : « ${verdict.label} ». Cette opinion est argumentée en section 8 et intègre les constats, leur classification et l'engagement de l'organisation à mettre en œuvre les actions de remédiation. Une session de débrief avec la direction est proposée afin de présenter de vive voix les principaux enseignements et de sécuriser l'appropriation du plan d'action par les responsables désignés.`,
  ]
}

// ── 04. Détail par domaine — narratif court par domaine ───────────────────

export function generateDomainNarrative(domain: DomainStat, data: AuditReportData): string[] {
  const fw = frameworkLabel(data)
  const status = domain.score >= 85 ? 'maîtrisé' : domain.score >= 70 ? 'globalement maîtrisé' : domain.score >= 55 ? 'partiellement maîtrisé' : 'à renforcer'
  const ncTotal = domain.ncMajor + domain.ncMinor

  // Paragraphe 1 — couverture & score
  const coverageClause = domain.scored > 0 && domain.scored < domain.total
    ? `${domain.scored} contrôles sur ${domain.total} ont fait l'objet d'une évaluation effective au cours de la mission`
    : domain.scored === domain.total && domain.total > 0
    ? `L'ensemble des ${domain.total} contrôles du domaine a été couvert par les travaux d'audit`
    : `Les contrôles de ce domaine n'ont pas été évalués au cours de la mission`
  const p1 = `${coverageClause}, soit un score pondéré de ${domain.score}%. Au terme de l'évaluation, le domaine ${domain.code} (${domain.name}) est qualifié de « ${status} » au regard des exigences du référentiel ${fw}.`

  // Paragraphe 2 — décomposition des résultats
  let p2: string
  if (domain.scored === 0) {
    p2 = `Aucune appréciation ne peut être formulée à ce stade : ce domaine devra faire l'objet d'une évaluation au cours d'une mission ultérieure.`
  } else {
    const conformesClause = domain.conformes > 0
      ? `${domain.conformes} contrôle${domain.conformes > 1 ? 's' : ''} ${domain.conformes > 1 ? 'ont été jugés' : 'a été jugé'} strictement conforme${domain.conformes > 1 ? 's' : ''}`
      : `Aucun contrôle n'a été jugé strictement conforme`
    const ncClause = ncTotal === 0
      ? `et aucune non-conformité formelle n'a été caractérisée sur le périmètre`
      : ncTotal === 1 && domain.ncMajor === 1
      ? `et une non-conformité majeure a été caractérisée, justifiant une attention prioritaire`
      : ncTotal === 1
      ? `et une non-conformité mineure a été caractérisée`
      : `${domain.ncMajor > 0 ? `${domain.ncMajor} non-conformité${domain.ncMajor > 1 ? 's' : ''} majeure${domain.ncMajor > 1 ? 's' : ''}` : ''}${domain.ncMajor > 0 && domain.ncMinor > 0 ? ' et ' : ''}${domain.ncMinor > 0 ? `${domain.ncMinor} non-conformité${domain.ncMinor > 1 ? 's' : ''} mineure${domain.ncMinor > 1 ? 's' : ''}` : ''} ont été caractérisée${ncTotal > 1 ? 's' : ''}`
    const obsClause = domain.observations > 0
      ? `, complétée${ncTotal > 1 ? 's' : ''} par ${domain.observations} observation${domain.observations > 1 ? 's' : ''} relevant d'opportunités d'amélioration sans qualification d'écart formel`
      : ''
    p2 = `${conformesClause} sur les ${domain.scored} évalués, ${ncClause}${obsClause}. Le détail des constats individuels est restitué dans les sections 5 (NC majeures) et 7 (plan d'action).`
  }

  // Paragraphe 3 — lecture qualitative + contrôles cités concrètement
  const strengths = topConformingControls(data, 3, domain.code)
  const weakness = topWeakControls(data, 3, domain.code)

  let p3 = ''
  if (domain.score >= 85) {
    p3 = `La maîtrise observée sur ce domaine témoigne d'une appropriation aboutie des exigences du référentiel.`
  } else if (domain.score >= 70) {
    p3 = `Le niveau de maîtrise observé est satisfaisant dans son ensemble, sous réserve de la prise en compte des écarts mineurs identifiés.`
  } else if (domain.score >= 55) {
    p3 = `Le dispositif présente des fragilités significatives qui appellent un effort de remédiation ciblé.`
  } else {
    p3 = `Ce domaine concentre une part importante des écarts identifiés au cours de l'audit et constitue un axe d'effort prioritaire.`
  }

  // Citations concrètes
  const concreteParts: string[] = []
  if (strengths.length > 0) {
    concreteParts.push(`Les contrôles ${listControls(strengths)} ont notamment été jugés conformes`)
  }
  if (weakness.length > 0) {
    const verb = strengths.length > 0 ? '. À l\'inverse,' : ' Les écarts identifiés portent sur'
    concreteParts.push(`${verb} ${listControls(weakness)} ${weakness.length === 1 ? 'a fait l\'objet' : 'ont fait l\'objet'} d'un constat formel`)
  }
  if (concreteParts.length > 0) {
    p3 += ' ' + concreteParts.join('') + '.'
  }

  return [p1, p2, p3]
}

// ── 05. Fiches NC majeures — sous-paragraphes ─────────────────────────────

export interface NCFactSheetSections {
  requirement: string
  observation: string
  evidence: string
  rootCause: string
  impact: string
  recommendation: string
  severityRationale: string
}

export function generateNCFactSheet(a: AssessmentWithControl, data: AuditReportData): NCFactSheetSections {
  const ctl = a.control
  const fw = frameworkLabel(data)
  const requirement = ctl.description?.trim()
    ? `Le contrôle ${ctl.code} du référentiel ${fw} stipule : « ${ctl.description.trim()} »`
    : `Le contrôle ${ctl.code} du référentiel ${fw} (« ${ctl.name} ») impose à l'organisation de définir, documenter et mettre en œuvre un dispositif permettant de garantir l'objectif visé par cette exigence.`

  const observation = (a.findings?.trim() && a.findings.trim().length > 0)
    ? a.findings.trim()
    : `Au cours de l'audit, l'équipe d'évaluation a identifié des éléments insuffisants au regard de l'exigence ci-dessus. Le détail des constats a été partagé avec les responsables concernés au cours de l'audit.`

  const evidence = (a.evidence_notes?.trim() && a.evidence_notes.trim().length > 0)
    ? a.evidence_notes.trim()
    : 'Revue documentaire des politiques et procédures applicables, croisée avec un entretien dirigé auprès du responsable du processus et un test de conformité par échantillonnage. Les workpapers correspondants sont archivés au dossier de mission.'

  const rootCause = generateRootCauseHypothesis(a)
  const impact = generateImpactAnalysis(a, data)

  const recommendation = (a.recommendations?.trim() && a.recommendations.trim().length > 0)
    ? a.recommendations.trim()
    : `Mettre en œuvre un dispositif documenté répondant à l'exigence du contrôle ${ctl.code}, en intégrant : (i) une politique formelle validée par la direction ; (ii) une procédure opérationnelle déclinée et communiquée ; (iii) des indicateurs de pilotage permettant d'attester l'efficacité du dispositif ; (iv) une revue périodique des éléments de preuve.`

  const severityRationale = `Cet écart est qualifié de non-conformité majeure compte tenu de son caractère structurant pour le dispositif global, de son potentiel impact sur l'atteinte des objectifs du référentiel et de l'absence d'élément compensatoire identifié par l'équipe d'audit.`

  return { requirement, observation, evidence, rootCause, impact, recommendation, severityRationale }
}

function generateRootCauseHypothesis(a: AssessmentWithControl): string {
  const code = a.control.code
  const name = a.control.name.toLowerCase()
  if (name.includes('politique') || name.includes('policy')) {
    return `L'absence ou l'insuffisance documentaire suggère une faiblesse dans le processus de définition, validation et diffusion des politiques de l'organisation. Une cause racine probable réside dans l'absence de comité formellement mandaté pour produire et faire vivre le corpus normatif interne.`
  }
  if (name.includes('accès') || name.includes('access')) {
    return `Les écarts observés sur ${code} renvoient probablement à une fragilité du processus de gestion du cycle de vie des identités, en particulier sur les phases d'attribution et de revue périodique des droits. La cause racine usuelle est l'absence d'une procédure de recertification programmée et tracée.`
  }
  if (name.includes('continu') || name.includes('résilience') || name.includes('reprise')) {
    return `La faiblesse du dispositif de continuité d'activité observée trouve souvent son origine dans l'absence d'un BIA (Business Impact Analysis) à jour, conduisant à une priorisation insuffisante des ressources et à des plans de reprise non testés en conditions opérationnelles.`
  }
  if (name.includes('fournisseur') || name.includes('tiers') || name.includes('supplier')) {
    return `L'écart relatif à la maîtrise de la chaîne fournisseurs reflète généralement un dispositif d'évaluation et de suivi insuffisamment formalisé, ainsi qu'une absence de clauses de sécurité contractuelles standardisées dans les contrats-cadres.`
  }
  if (name.includes('incident') || name.includes('événement')) {
    return `Les insuffisances observées sur la gestion des incidents traduisent souvent un défaut de procédure de qualification et d'escalade, combiné à l'absence d'une cellule de crise pré-mandatée et entraînée régulièrement.`
  }
  return `La cause racine la plus probable de cet écart, à confirmer dans le cadre du plan d'action, est un défaut de formalisation du processus correspondant et/ou l'absence d'un acteur clairement désigné en responsabilité opérationnelle de l'exigence.`
}

function generateImpactAnalysis(a: AssessmentWithControl, data: AuditReportData): string {
  const fw = frameworkLabel(data)
  const sector = data.client?.sector ?? 'le secteur de l\'organisation'
  return `À court terme, cet écart expose l'organisation à un risque de non-conformité au référentiel ${fw}, susceptible de compromettre l'obtention ou le maintien de l'attestation correspondante. À moyen terme, l'absence du dispositif attendu peut générer une exposition opérationnelle accrue dans ${sector}, des difficultés à répondre aux contrôles externes (régulateur, partenaires, clients sensibles), ainsi qu'une perte de mémoire organisationnelle en cas de turnover sur les fonctions concernées. La criticité du contrôle ${a.control.code} dans le cadre du référentiel justifie la qualification en non-conformité majeure et la priorité accordée à sa remédiation.`
}

// ── 06. Recommandations & matrice ─────────────────────────────────────────

export function generateRecommendationNarrative(data: AuditReportData): string[] {
  const t = data.totals
  const totalRecos = t.ncMajor + t.ncMinor + t.observations
  return [
    `À l'issue de l'évaluation, ${totalRecos} recommandations distinctes ont été formulées et hiérarchisées. La matrice de priorisation ci-dessous positionne chaque recommandation selon deux axes : son impact attendu sur la conformité d'ensemble (axe vertical) et l'effort de mise en œuvre estimé (axe horizontal). Les recommandations situées dans le quadrant supérieur gauche (impact élevé / effort modéré) constituent les « quick wins » à initier sans délai.`,
    `Trois niveaux de priorité ont été définis : P1 correspond aux non-conformités majeures dont le traitement conditionne la délivrance ou le maintien de l'attestation ; P2 correspond aux non-conformités mineures à intégrer au plan d'action de l'année en cours ; P3 correspond aux observations à intégrer au cycle d'amélioration continue. La séquence de mise en œuvre proposée est : adressage prioritaire des P1 dans les 90 jours, intégration des P2 sur 180 jours et planification des P3 sur 12 mois.`,
  ]
}

// ── 07. Plan d'action ──────────────────────────────────────────────────────

export function generateActionPlanNarrative(data: AuditReportData): string[] {
  const t = data.totals
  const total = t.ncMajor + t.ncMinor + t.observations
  return [
    `Le plan d'action de remédiation a été initialisé sur la plateforme à la clôture de la mission. Il regroupe ${total} demandes d'action corrective (CAR) reflétant l'ensemble des constats formellement caractérisés au cours de l'audit. Chaque CAR est rattachée au contrôle d'origine et à la fiche de constat correspondante, garantissant une traçabilité complète entre l'écart, la recommandation et l'action de remédiation associée.`,
    `Le cycle de vie de chaque CAR comporte quatre étapes : (i) émission par l'auditeur à la clôture de la mission ; (ii) prise en charge par le responsable désigné côté ${data.client?.name ?? 'entité auditée'}, qui renseigne la cause racine, l'action corrective retenue et l'échéance de réalisation ; (iii) mise en œuvre opérationnelle par l'organisation, dépôt des éléments de preuve sur la plateforme ; (iv) vérification et clôture par l'équipe d'audit. Une CAR rejetée à l'étape (iv) revient à l'étape (ii) avec une demande de complément.`,
    `Le tableau ci-dessous récapitule les ${Math.min(total, 40)} premières CAR du plan, triées par priorité décroissante. Le plan complet est consultable et exportable en format Excel directement depuis la plateforme, par les utilisateurs habilités. Une revue d'avancement intermédiaire est recommandée à 90 jours, puis trimestriellement jusqu'à clôture intégrale du plan.`,
  ]
}

// ── 08. Conclusion ────────────────────────────────────────────────────────

export function generateConclusionNarrative(data: AuditReportData): string[] {
  const v = describeVerdict(data.totals.conformityScore, data.totals.ncMajor)
  const fw = frameworkLabel(data)
  const period = formatPeriod(data.mission.start_date, data.mission.end_date)
  return [
    `Au terme de la mission conduite sur la période du ${period} et de l'évaluation des ${data.totals.totalControls} contrôles formant le cadre de référence ${fw}, l'équipe d'audit a obtenu une assurance raisonnable quant au niveau de conformité atteint par ${data.client?.name ?? 'l\'organisation auditée'}. Cette assurance s'appuie sur l'ensemble des éléments de preuve collectés, examinés et tracés au dossier de mission, dont la liste détaillée figure en Annexe B.`,
    `Le score pondéré global s'établit à ${data.totals.conformityScore}%, traduisant une maîtrise ${v.qualifier} des exigences du référentiel. ${data.totals.ncMajor} non-conformité(s) majeure(s) et ${data.totals.ncMinor} non-conformité(s) mineure(s) ont été caractérisées, complétées par ${data.totals.observations} observation(s). Le détail individuel, les recommandations associées et le plan d'action sont restitués respectivement aux sections 5, 6 et 7 du présent rapport.`,
    `Au regard de ces éléments, et après prise en compte de la position de la direction de ${data.client?.name ?? 'l\'organisation'} formulée en réunion de clôture, l'opinion d'audit retenue est : « ${v.label} ». Cette opinion est délivrée sous réserve de la mise en œuvre effective du plan d'action de remédiation dans les délais convenus, et sans préjudice de la possibilité, pour l'équipe d'audit, de procéder à des contrôles complémentaires en cas d'évolution significative du périmètre ou du dispositif.`,
    `Nous restons à la disposition de la direction et des instances de gouvernance de ${data.client?.name ?? 'l\'organisation'} pour présenter de vive voix les conclusions du présent rapport, en discuter les implications opérationnelles et accompagner, dans le cadre d'un mandat distinct, la mise en œuvre du plan d'action de remédiation. Le suivi des CAR est dès à présent ouvert sur la plateforme et nous procéderons à une revue d'avancement intermédiaire à 90 jours.`,
  ]
}

export function generateExecutiveLetterBody(data: AuditReportData): string[] {
  const v = describeVerdict(data.totals.conformityScore, data.totals.ncMajor)
  const fw = frameworkLabel(data)
  const period = formatPeriod(data.mission.start_date, data.mission.end_date)
  const clientName = clientLabel(data)
  return [
    `Madame, Monsieur,`,
    `Conformément à la lettre de mission qui nous a été confiée, nos équipes ont conduit, sur la période du ${period}, l'audit de conformité de ${clientName} aux exigences du référentiel ${fw}. Le présent document constitue le rapport définitif de cette mission. Il restitue, de manière détaillée et tracée, les travaux conduits, les constats formulés, les recommandations associées ainsi que l'opinion d'audit retenue.`,
    `Au terme de l'évaluation des ${data.totals.totalControls} contrôles du périmètre, le niveau de conformité global s'établit à ${data.totals.conformityScore}% (score pondéré). ${data.totals.ncMajor} non-conformité(s) majeure(s) et ${data.totals.ncMinor} non-conformité(s) mineure(s) ont été formellement caractérisées, complétées par ${data.totals.observations} observation(s). Notre opinion d'audit est, au regard de ces éléments, « ${v.label} ».`,
    `Le détail individuel des constats, les recommandations associées et la matrice de priorisation correspondante sont restitués dans le corps du rapport. Le plan d'action de remédiation, ouvert dès la clôture de la mission, est suivi sur la plateforme et fera l'objet d'une revue d'avancement à 90 jours puis trimestrielle. Nos équipes restent à votre disposition pour présenter de vive voix les conclusions du rapport et en discuter les implications opérationnelles.`,
    `Vous remerciant pour la qualité de l'accueil réservé à nos équipes durant la mission, nous vous prions d'agréer, Madame, Monsieur, l'expression de notre considération distinguée.`,
  ]
}

// ── Glossaire ──────────────────────────────────────────────────────────────

export function generateGlossary(): { term: string; def: string }[] {
  return [
    { term: 'CAR', def: 'Corrective Action Request — demande d\'action corrective émise à la clôture d\'une mission, opposable à l\'entité auditée pour traitement formalisé d\'une non-conformité ou d\'une observation.' },
    { term: 'NC majeure', def: 'Non-conformité majeure — manquement substantiel à une exigence du référentiel, susceptible de compromettre l\'atteinte des objectifs du système de management ou la délivrance / le maintien d\'une attestation.' },
    { term: 'NC mineure', def: 'Non-conformité mineure — écart ponctuel ou d\'application incomplète, n\'affectant pas la capacité d\'ensemble du dispositif à atteindre son objectif.' },
    { term: 'Observation', def: 'Opportunité d\'amélioration identifiée par l\'équipe d\'audit, sans qualification d\'écart formel.' },
    { term: 'Score pondéré', def: 'Score de conformité agrégé selon la pondération c=100 / lc=75 / pc=50 / nc=0, les contrôles non-applicables étant exclus du calcul.' },
    { term: 'Workpaper', def: 'Fiche de travail documentant un test d\'audit : objectif, périmètre, technique mobilisée, échantillon retenu, résultats, conclusion.' },
    { term: 'Échantillonnage', def: 'Sélection raisonnée d\'un sous-ensemble d\'éléments à tester, dimensionnée selon le seuil de matérialité et la criticité du contrôle.' },
    { term: 'Matérialité', def: 'Seuil au-delà duquel un écart est jugé significatif au regard des objectifs de l\'audit.' },
    { term: 'Re-performance', def: 'Technique consistant à exécuter à nouveau un contrôle automatisé ou manuel afin d\'apprécier son efficacité opérationnelle.' },
    { term: 'Revue documentaire', def: 'Examen critique des politiques, procédures, comptes-rendus et enregistrements en vigueur dans l\'organisation.' },
    { term: 'BIA', def: 'Business Impact Analysis — analyse d\'impact sur l\'activité, base de la priorisation des ressources critiques pour le plan de continuité.' },
    { term: 'SoA', def: 'Statement of Applicability — déclaration d\'applicabilité justifiant les exclusions de contrôles dans une démarche ISO 27001.' },
  ]
}

// ── Helpers narratifs ─────────────────────────────────────────────────────

/**
 * Libellé du référentiel utilisé dans la prose. Source unique : la relation
 * jointe `mission.framework.name` (cf. useMissionDetail). Fallback neutre
 * si la jointure est manquante (ne devrait pas arriver en prod).
 */
export function frameworkLabel(data: AuditReportData): string {
  const fw = (data.mission as unknown as { framework?: { name?: string | null } }).framework
  const name = fw?.name?.trim()
  return name && name.length > 0 ? name : 'le référentiel applicable'
}

/**
 * Libellé du client utilisé dans la prose. Priorité : cabinet_clients.name
 * (préféré car renseigné par le cabinet), fallback sur la relation jointe
 * mission.client.name (organization), puis fallback neutre.
 */
export function clientLabel(data: AuditReportData): string {
  if (data.client?.name?.trim()) return data.client.name.trim()
  const org = (data.mission as unknown as { client?: { name?: string | null } }).client
  if (org?.name?.trim()) return org.name.trim()
  return 'l\'organisation auditée'
}

function inferAuditPurpose(missionDescription: string): string {
  const d = missionDescription.toLowerCase()
  if (d.includes('annuel')) return 'un audit de surveillance annuel'
  if (d.includes('initial') || d.includes('cadrage')) return 'un audit de certification initial'
  if (d.includes('renouvel')) return 'un audit de renouvellement de certification'
  if (d.includes('surveillance')) return 'un audit de surveillance'
  if (d.includes('due diligence')) return 'une mission de due diligence'
  if (d.includes('conformité')) return 'un audit de conformité ciblé'
  return 'la présente mission d\'audit de conformité'
}

function memberFullName(data: AuditReportData, role: string): string | null {
  const m = data.members.find((x) => x.role === role)
  if (!m) return null
  const u = (m as unknown as { user?: { first_name?: string; last_name?: string } }).user
  if (!u) return null
  const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
  return name || null
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return 'la période sous revue'
  const fmt = (iso: string | null | undefined): string => iso
    ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'
  return `${fmt(start)} au ${fmt(end)}`
}

function computeDuration(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) return 'plusieurs semaines'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
  if (days < 14) return `${days} jours`
  const weeks = Math.round(days / 7)
  if (weeks < 8) return `${weeks} semaines`
  const months = Math.round(days / 30)
  return `${months} mois`
}
