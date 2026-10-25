import { View, Text } from '@react-pdf/renderer'
import { SectionBanner, Prose, H3, PdfTable } from '../report-kit/components'
import {
  formatDate, generateClientPresentation, generateMissionPurpose,
  generateStructuralObjectives, generateRiskMitigation,
} from '../scoping-note/narratives'
import { Callout, ObjectiveCard, PerimeterGrid, RiskCard } from './components'
import type { ScopingSectionProps } from './model'

export function PreambuleSection({ data, theme, num, title, lead }: ScopingSectionProps): JSX.Element {
  const regs = data.client?.exigences_reglementaires ?? []
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <H3 theme={theme}>Présentation du client</H3>
      <Prose paragraphs={[generateClientPresentation(data)]} />
      <H3 theme={theme}>Cadre réglementaire et normatif</H3>
      {regs.length === 0 ? (
        <Prose paragraphs={["Aucune réglementation particulière n'a été renseignée dans le dossier client au moment du cadrage."]} />
      ) : (
        <PdfTable theme={theme} headers={['Réglementation', 'Type', 'Impact']} widths={[52, 24, 24]}
          rows={regs.map((r) => [r.nom, r.type ?? '-', (r.impact ?? '-').toUpperCase()])} />
      )}
      <H3 theme={theme}>Déclencheur et finalité</H3>
      <Prose paragraphs={[generateMissionPurpose(data)]} />
      {data.mission.audit_objectives ? <Callout tone="gold" theme={theme} title="Objectifs énoncés (saisis lors du cadrage)" text={`« ${data.mission.audit_objectives} »`} /> : null}
    </View>
  )
}

export function ObjectifsSection({ data, theme, num, title, lead }: ScopingSectionProps): JSX.Element {
  const objectives = generateStructuralObjectives(data)
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <Prose paragraphs={['La mission poursuit les objectifs principaux suivants, structurés autour du référentiel et des exigences applicables :']} />
      {objectives.map((o, i) => <ObjectiveCard key={i} num={i + 1} title={o.title} desc={o.description} theme={theme} />)}
      {data.mission.audit_criteria ? (
        <>
          <H3 theme={theme}>Critères d&rsquo;évaluation précisés par le sponsor</H3>
          <Prose paragraphs={[`« ${data.mission.audit_criteria} »`]} />
        </>
      ) : null}
    </View>
  )
}

export function PerimetreSection({ data, theme, num, title, lead }: ScopingSectionProps): JSX.Element {
  const fw = `${data.mission.framework?.name ?? '-'}${data.mission.framework?.version ? ' v' + data.mission.framework.version : ''}`
  const sys = data.client?.it_systems ?? []
  const cards = [
    { accent: theme.primary, title: 'Fonctionnel', text: `Intégralité du périmètre couvert par le référentiel ${fw}, soit ${data.domains.length} domaine(s).` },
    { accent: theme.accent, title: 'Organisationnel', text: `Évaluation portant sur ${data.client?.client_name ?? data.mission.client?.name ?? "l'entité cliente"}${data.client?.effectifs ? ` (${data.client.effectifs} collaborateurs)` : ''}.` },
    { accent: '#2563eb', title: 'Temporel', text: `Mission conduite du ${formatDate(data.mission.start_date)} au ${formatDate(data.mission.end_date)} (${data.durationWeeks} semaines).` },
    { accent: '#2d6a4f', title: 'Technique', text: sys.length > 0 ? `Systèmes principaux : ${sys.slice(0, 5).join(', ')}.` : 'Liste détaillée des systèmes à confirmer en début de mission.' },
  ]
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <PerimeterGrid cards={cards} theme={theme} />
      <H3 theme={theme}>Domaines et inclusion par contrôle</H3>
      <PdfTable theme={theme} headers={['Domaine', 'Libellé', 'Inclus / Total', 'Couverture']} widths={[18, 50, 18, 14]}
        rows={data.domains.map((d) => {
          const total = d.controls.length
          const incl = d.controls.filter((c) => !data.excludedIds.has(c.id)).length
          return [d.code ?? '-', d.name, `${incl} / ${total}`, `${total > 0 ? Math.round((incl / total) * 100) : 0} %`]
        })} />
      {data.exclusions.length > 0 ? (
        <>
          <H3 theme={theme}>Exclusions documentées</H3>
          {data.exclusions.map((ex) => {
            const ctrl = data.domains.flatMap((d) => d.controls).find((c) => c.id === ex.control_id)
            return <Callout key={ex.id} tone="forest" theme={theme} title={ctrl ? `${ctrl.code ?? ''} ${ctrl.name ?? ''}`.trim() : 'Contrôle'} text={`Motif : « ${ex.reason} »`} />
          })}
        </>
      ) : null}
    </View>
  )
}

export function MethodologieSection({ theme, num, title, lead }: ScopingSectionProps): JSX.Element {
  const phases = [
    ['1', 'Cadrage', "Validation du périmètre, de l'équipe et du planning."],
    ['2', 'Prise de connaissance', 'Questionnaire structuré, collecte documentaire.'],
    ['3', 'Exécution', 'Entretiens, observations, revues de configuration.'],
    ['4', 'Synthèse', 'Qualification des écarts, plan de remédiation, restitutions.'],
    ['5', 'Livraison', "Rapport définitif et transfert du dossier d'audit."],
  ]
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      <Prose paragraphs={["La mission s'appuie sur une démarche d'audit fondée sur les risques conforme aux principes de l'ISO/IEC 27007:2020. Les contrôles sont priorisés par leur exposition au risque résiduel et leur criticité opérationnelle."]} />
      <H3 theme={theme}>Cinq phases d&rsquo;audit</H3>
      {phases.map((p) => (
        <Text key={p[0]} style={{ fontSize: 9, color: '#374151', marginBottom: 3 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', color: theme.primary }}>{p[0]}. </Text>
          <Text style={{ fontFamily: 'Helvetica-Bold', color: theme.ink }}>{p[1]} </Text>: {p[2]}
        </Text>
      ))}
      <H3 theme={theme}>Échelle de maturité : niveaux 0 à 5</H3>
      <PdfTable theme={theme} headers={['Niv.', 'Libellé', 'Critère']} widths={[10, 26, 64]} rows={[
        ['0', 'Inexistant', 'Aucun élément observable.'],
        ['1', 'Initial', 'Mise en œuvre informelle, ad hoc.'],
        ['2', 'Reproductible', 'Pratique documentée, application inégale.'],
        ['3', 'Défini', 'Procédure formalisée et déployée.'],
        ['4', 'Maîtrisé', "Indicateurs mesurés, revues d'efficacité."],
        ['5', 'Optimisé', 'Amélioration continue documentée.'],
      ]} />
    </View>
  )
}

export function RisquesSection({ data, theme, num, title, lead }: ScopingSectionProps): JSX.Element {
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      {data.risks.length === 0 ? (
        <Prose paragraphs={["Aucun risque n'a été identifié lors du cadrage."]} />
      ) : (
        <>
          <Prose paragraphs={[`Au stade du cadrage, l'équipe a identifié ${data.risks.length} risque(s) significatif(s) susceptibles d'affecter la mission ou son exécution.`]} />
          {data.risks.map((r) => <RiskCard key={r.id} risk={r} mitigation={generateRiskMitigation(r.risk_level)} theme={theme} />)}
        </>
      )}
    </View>
  )
}
