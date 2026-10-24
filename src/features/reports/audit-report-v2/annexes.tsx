import { View, Text } from '@react-pdf/renderer'
import { generateGlossary, frameworkLabel } from '../auditReportNarratives'
import { formatDate } from '../audit-report/utils'
import { ROLE_LABELS } from '../../missions/mission-constants'
import { SectionBanner, H3, PdfTable, Prose } from './components'
import type { ReportTheme } from './report-model'
import type { SectionProps } from './sections'

function KeyVal({ k, v, theme, kw = 70 }: { k: string; v: string; theme: ReportTheme; kw?: number }): JSX.Element {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 4 }} wrap={false}>
      <Text style={{ width: kw, fontSize: 9, fontFamily: 'Helvetica-Bold', color: theme.ink, paddingRight: 6 }}>{k}</Text>
      <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.4, color: '#374151' }}>{v}</Text>
    </View>
  )
}

export function AnnexGlossarySection({ theme }: SectionProps): JSX.Element {
  return (
    <View>
      <SectionBanner num="A" title="Glossaire" lead="Définitions des termes techniques utilisés dans le rapport" theme={theme} />
      {generateGlossary().map((g) => <KeyVal key={g.term} k={g.term} v={g.def} theme={theme} kw={90} />)}
    </View>
  )
}

export function AnnexEvidenceSection({ data, theme }: SectionProps): JSX.Element {
  const docs = data.evidenceDocs
  return (
    <View>
      <SectionBanner num="B" title="Preuves examinées" lead="Éléments documentaires versés au dossier de mission" theme={theme} />
      {docs.length === 0 ? (
        <Text style={{ fontSize: 9.5, lineHeight: 1.5, color: theme.muted }}>Aucun document versé au dossier via la plateforme. Les preuves examinées ont fait l&rsquo;objet de constats archivés dans les fiches de travail internes.</Text>
      ) : (
        <PdfTable
          theme={theme}
          headers={['Date', 'Type', 'Nom du fichier']}
          widths={[20, 26, 54]}
          rows={docs.map((d) => [formatDate(d.created_at), d.document_type ?? '-', d.file_name])}
        />
      )}
    </View>
  )
}

export function AnnexReferencesSection({ data, theme }: SectionProps): JSX.Element {
  const fw = frameworkLabel(data)
  const refs: { ref: string; title: string }[] = [
    { ref: fw || 'Référentiel d’audit', title: 'Cadre de référence principal de la mission' },
    { ref: 'ISO 19011:2018', title: 'Lignes directrices pour l’audit des systèmes de management' },
    { ref: 'ISO/IEC 17021-1:2015', title: 'Exigences pour les organismes d’audit et de certification des systèmes de management' },
    { ref: 'COSO (2013)', title: 'Cadre intégré de contrôle interne (Committee of Sponsoring Organizations)' },
    { ref: 'IIA - IPPF', title: 'International Professional Practices Framework (Institute of Internal Auditors)' },
  ]
  return (
    <View>
      <SectionBanner num="C" title="Références normatives" lead="Standards et bonnes pratiques mobilisés au cours de l'audit" theme={theme} />
      {refs.map((r) => <KeyVal key={r.ref} k={r.ref} v={r.title} theme={theme} kw={110} />)}
    </View>
  )
}

function DistRow({ name, role, email, theme }: { name: string; role: string; email: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.4, borderBottomColor: theme.border }} wrap={false}>
      <Text style={{ flex: 3, fontSize: 9, fontFamily: 'Helvetica-Bold', color: theme.ink }}>{name}</Text>
      <Text style={{ flex: 3, fontSize: 8.5, color: theme.muted }}>{role}</Text>
      <Text style={{ flex: 4, fontSize: 8.5, color: '#374151', textAlign: 'right' }}>{email}</Text>
    </View>
  )
}

export function AnnexDistributionSection({ data, theme }: SectionProps): JSX.Element {
  return (
    <View>
      <SectionBanner num="D" title="Liste de diffusion" lead="Destinataires autorisés du présent rapport (confidentialité)" theme={theme} />
      <Prose paragraphs={['Le présent rapport est confidentiel ; sa diffusion est strictement restreinte aux personnes listées ci-dessous. Toute communication ou reproduction hors de ce périmètre nécessite l’accord écrit préalable du cabinet.']} />
      <H3 theme={theme}>Côté cabinet</H3>
      {data.members.map((m) => {
        const u = (m as unknown as { user?: { first_name?: string; last_name?: string; email?: string; job_title?: string } }).user
        if (!u) return null
        const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
        const role = (ROLE_LABELS[m.role] ?? m.role) + (u.job_title ? ` · ${u.job_title}` : '')
        return <DistRow key={m.id} name={name} role={role} email={u.email ?? ''} theme={theme} />
      })}
      <H3 theme={theme}>Côté entité auditée</H3>
      {data.clientContacts.length === 0 ? (
        <Text style={{ fontSize: 9, color: theme.muted }}>Aucun contact client déclaré sur la plateforme.</Text>
      ) : (
        data.clientContacts.map((c) => <DistRow key={c.id} name={c.contact_name} role={c.job_title ?? 'Contact'} email={c.email} theme={theme} />)
      )}
    </View>
  )
}
