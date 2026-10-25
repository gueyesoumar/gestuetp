import { View, Text } from '@react-pdf/renderer'
import { CR_SECTION_CATALOG } from './catalog'
import { CRSectionHeader, IconLine, NumberedLine, SignatureBoxes } from './components'
import type { CRSectionProps } from './model'

// Sections du compte-rendu d'entretien. Les sections sans contenu sont omises
// (conforme au moteur v1), sauf Actions (note "a completer"). RFC 0021 E2.2.

function ObjetSection({ data, theme, title, lead }: CRSectionProps): JSX.Element {
  return (
    <View>
      <CRSectionHeader title={title} lead={lead} theme={theme} />
      <Text style={{ fontSize: 9, lineHeight: 1.5, color: '#374151' }}>{data.interview.title}</Text>
    </View>
  )
}

function ConstatsSection({ data, theme, title, lead }: CRSectionProps): JSX.Element {
  if (data.parsed.findings.length === 0) return <View />
  return (
    <View>
      <CRSectionHeader title={title} lead={lead} theme={theme} />
      {data.parsed.findings.map((f, i) => <NumberedLine key={i} num={i + 1} text={f} theme={theme} />)}
    </View>
  )
}

function PositifsSection({ data, theme, title, lead }: CRSectionProps): JSX.Element {
  if (data.parsed.positives.length === 0) return <View />
  return (
    <View>
      <CRSectionHeader title={title} lead={lead} theme={theme} />
      {data.parsed.positives.map((p, i) => <IconLine key={i} text={p} color="#15803d" icon="✓" />)}
    </View>
  )
}

function AttentionSection({ data, theme, title, lead }: CRSectionProps): JSX.Element {
  if (data.parsed.concerns.length === 0) return <View />
  return (
    <View>
      <CRSectionHeader title={title} lead={lead} theme={theme} />
      {data.parsed.concerns.map((c, i) => <IconLine key={i} text={c} color="#e67e22" icon="!" />)}
    </View>
  )
}

function ActionsSection({ data, theme, title, lead }: CRSectionProps): JSX.Element {
  return (
    <View>
      <CRSectionHeader title={title} lead={lead} theme={theme} />
      {data.parsed.actions.length > 0
        ? data.parsed.actions.map((a, i) => <NumberedLine key={i} num={i + 1} text={a} theme={theme} />)
        : <Text style={{ fontSize: 8.5, fontStyle: 'italic', color: theme.muted }}>Aucune action identifiée : à compléter.</Text>}
    </View>
  )
}

function DocumentsSection({ data, theme, title, lead }: CRSectionProps): JSX.Element {
  if (data.parsed.documents.length === 0) return <View />
  return (
    <View>
      <CRSectionHeader title={title} lead={lead} theme={theme} />
      {data.parsed.documents.map((d, i) => (
        <Text key={i} style={{ fontSize: 9, color: '#374151', marginBottom: 2 }}><Text style={{ color: theme.primary }}>• </Text>{d}</Text>
      ))}
    </View>
  )
}

function SignaturesSection({ data, theme, title, lead }: CRSectionProps): JSX.Element {
  return (
    <View>
      <CRSectionHeader title={title} lead={lead} theme={theme} />
      <SignatureBoxes auditorName={data.auditorName} contactName={data.contact?.name ?? 'N/A'} theme={theme} />
    </View>
  )
}

export interface CRContentSection {
  key: string
  title: string
  Component: (props: CRSectionProps) => JSX.Element
}

const COMPONENTS: Record<string, (props: CRSectionProps) => JSX.Element> = {
  objet: ObjetSection,
  constats: ConstatsSection,
  positifs: PositifsSection,
  attention: AttentionSection,
  actions: ActionsSection,
  documents: DocumentsSection,
  signatures: SignaturesSection,
}

export const CR_CONTENT_SECTIONS: CRContentSection[] = CR_SECTION_CATALOG
  .map((c) => ({ key: c.key, title: c.title, Component: COMPONENTS[c.key] }))
  .filter((c): c is CRContentSection => Boolean(c.Component))
