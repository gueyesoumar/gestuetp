import { View, Text } from '@react-pdf/renderer'
import { SectionBanner, Prose, H3, PdfTable } from '../report-kit/components'
import { formatDate, generateHypotheses, computeMilestones } from '../scoping-note/narratives'
import { Callout, Gantt, SignatureRow } from './components'
import type { ScopingSectionProps } from './model'

export function EquipeSection({ data, theme, num, title, lead, options }: ScopingSectionProps): JSX.Element {
  const showRaci = options.raci !== false
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <H3 theme={theme}>Équipe d&rsquo;audit affectée</H3>
      <Prose paragraphs={[`L'équipe est composée de ${data.members.length} membre(s) couvrant l'ensemble des compétences nécessaires à la mission.`]} />
      <PdfTable theme={theme} headers={['Auditeur', 'Rôle', 'Coordonnées']} widths={[30, 28, 42]}
        rows={data.members.map((m) => [`${m.user.first_name} ${m.user.last_name}`, data.roleLabel(m.role), [m.user.email, m.user.job_title].filter(Boolean).join(', ') || '-'])} />
      {showRaci ? (
        <>
          <H3 theme={theme}>Matrice RACI standard</H3>
          <PdfTable theme={theme} headers={['Activité', 'Sponsor', 'Réf. tech.', 'Chef de mission', 'Associé']} widths={[40, 15, 15, 15, 15]} rows={[
            ['Validation du périmètre', 'A', 'C', 'R', 'I'],
            ['Mise à disposition de la documentation', 'I', 'R', 'C', 'I'],
            ['Conduite des entretiens', 'I', 'C', 'R', 'I'],
            ['Qualification des écarts', 'I', 'C', 'R', 'A'],
            ['Plan de remédiation', 'I', 'R', 'C', 'I'],
            ['Validation rapport final', 'A', 'C', 'R', 'A'],
          ]} />
          <Text style={{ fontSize: 8, color: theme.muted }}>R = Réalisateur, A = Approbateur, C = Consulté, I = Informé</Text>
        </>
      ) : null}
    </View>
  )
}

export function PlanningSection({ data, theme, num, title, lead, options }: ScopingSectionProps): JSX.Element {
  const showGantt = options.gantt !== false
  const phases = [
    { label: '1. Cadrage', pctStart: 0, pctW: 10 },
    { label: '2. Prise de connaissance', pctStart: 10, pctW: 18 },
    { label: '3. Exécution sur terrain', pctStart: 28, pctW: 35 },
    { label: '4. Synthèse', pctStart: 63, pctW: 14 },
    { label: '5. Livraison', pctStart: 77, pctW: 10 },
  ]
  const milestones = computeMilestones(data.mission.start_date, data.mission.end_date)
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <Prose paragraphs={[`La mission s'étend du ${formatDate(data.mission.start_date)} au ${formatDate(data.mission.end_date)}, soit ${data.durationWeeks} semaines. Le découpage standard du cabinet en cinq phases est proportionné à cette durée.`]} />
      {showGantt ? (<><H3 theme={theme}>Vue Gantt des phases</H3><Gantt phases={phases} theme={theme} /></>) : null}
      <H3 theme={theme}>Jalons clés (calculés)</H3>
      <PdfTable theme={theme} headers={['#', 'Jalon', 'Date estimée']} widths={[10, 60, 30]} rows={milestones.map((m) => [m.code, m.label, m.date])} />
      <Text style={{ fontSize: 8.5, color: theme.muted, marginTop: 2 }}>Les dates exactes des jalons seront confirmées en première semaine. Tout glissement supérieur à deux semaines sur le chemin critique fera l&rsquo;objet d&rsquo;un avenant.</Text>
    </View>
  )
}

export function LivrablesSection({ data, theme, num, title, lead }: ScopingSectionProps): JSX.Element {
  const end = data.mission.end_date ? formatDate(data.mission.end_date) : '-'
  const instances = [
    ['COPIL hebdomadaire', 'Vendredi, 45 min. Avancement, levée des points bloquants.'],
    ['Point quotidien', "15 min en phase d'exécution uniquement."],
    ['Revues qualité internes', 'Mi-mission et avant restitution finale.'],
  ]
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <H3 theme={theme}>Livrables prévus</H3>
      <PdfTable theme={theme} headers={['Livrable', 'Format', 'Date prévue']} widths={[46, 34, 20]} rows={[
        ['Note de cadrage signée', 'PDF', '~ Semaine 1'],
        ['Rapport intermédiaire', 'PDF + restitution 90 min', '~ Semaine 6'],
        ['Rapport provisoire', 'PDF + restitution 60 min', '~ Semaine 10'],
        ['Rapport définitif', 'PDF + version éditable', end],
        ['Plan de remédiation', 'Tableur + PDF', end],
      ]} />
      <H3 theme={theme}>Instances de pilotage</H3>
      {instances.map((it) => (
        <Text key={it[0]} style={{ fontSize: 9, color: '#374151', marginBottom: 2 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', color: theme.ink }}>• {it[0]} </Text>: {it[1]}
        </Text>
      ))}
      <H3 theme={theme}>Règles d&rsquo;escalade et de communication</H3>
      <Prose paragraphs={["Tout point bloquant non levé sous 3 jours ouvrés est porté en COPIL. Les désaccords de qualification d'un écart sont arbitrés par l'associé en charge et le sponsor sous 5 jours ouvrés. Les conflits d'intérêts éventuels sont déclarés sans délai au comité d'éthique du cabinet et au sponsor."]} />
    </View>
  )
}

export function HypothesesSection({ data, theme, num, title, lead }: ScopingSectionProps): JSX.Element {
  const hyp = generateHypotheses(data)
  const conditions = [
    'Engagement formel du sponsor pour la levée rapide des points bloquants en COPIL.',
    'Transparence des équipes opérationnelles dans les entretiens, garantie par la clause de confidentialité du contrat.',
    "Disponibilité d'un référent technique unique côté client sur toute la durée.",
    "Mise à disposition d'un espace de travail pour l'équipe d'audit en phase d'exécution.",
  ]
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <H3 theme={theme}>Hypothèses retenues</H3>
      {hyp.map((h, i) => (
        <Text key={i} style={{ fontSize: 9, color: '#374151', marginBottom: 3 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', color: theme.primary }}>H{i + 1}. </Text>{h}
        </Text>
      ))}
      <H3 theme={theme}>Conditions de réussite</H3>
      {conditions.map((c, i) => (
        <Text key={i} style={{ fontSize: 9, color: '#374151', marginBottom: 2 }}>
          <Text style={{ color: theme.primary }}>• </Text>{c}
        </Text>
      ))}
      <H3 theme={theme}>Limitations</H3>
      <Callout tone="gold" theme={theme} title="Cadre de validité"
        text="L'audit n'est pas un audit de certification : il ne donne pas droit à délivrance de certificat. Périmètre limité aux contrôles inclus (cf. section Périmètre). Conclusions à date : toute évolution ultérieure du périmètre évalué n'est pas reflétée." />
    </View>
  )
}

export function SignaturesSection({ data, theme, num, title, lead }: ScopingSectionProps): JSX.Element {
  const lead1 = data.members.find((m) => m.role === 'lead_auditor')
  const associate = data.members.find((m) => m.role === 'associate')
  const cards = [
    { role: 'Sponsor client', name: 'À désigner', subtitle: 'Représentant habilité du client' },
    { role: data.roleLabel('lead_auditor'), name: lead1 ? `${lead1.user.first_name} ${lead1.user.last_name}` : 'À désigner', subtitle: lead1?.user.job_title ?? '-' },
    { role: data.roleLabel('associate'), name: associate ? `${associate.user.first_name} ${associate.user.last_name}` : 'À désigner', subtitle: associate?.user.job_title ?? '-' },
  ]
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <Prose paragraphs={["Les soussignés reconnaissent avoir pris connaissance de la présente note de cadrage et des engagements qu'elle décrit, et l'approuvent dans son intégralité."]} />
      <SignatureRow cards={cards} theme={theme} />
      {data.mission.scoping_notes ? <View style={{ marginTop: 8 }}><Callout tone="gold" theme={theme} title="Observations complémentaires" text={`« ${data.mission.scoping_notes} »`} /></View> : null}
    </View>
  )
}
