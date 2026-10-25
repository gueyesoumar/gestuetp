import { View, Text } from '@react-pdf/renderer'
import type { ReportTheme } from '../report-kit/theme'
import type { CRDecoratedData } from './model'

// Sous-composants react-pdf specifiques au compte-rendu d'entretien. RFC 0021 E2.2.

function InfoField({ label, value, theme }: { label: string; value: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ width: '50%', marginBottom: 8 }}>
      <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: theme.muted }}>{label}</Text>
      <Text style={{ fontSize: 9, color: theme.ink, marginTop: 1 }}>{value}</Text>
    </View>
  )
}

/** En-tete du CR : titre, carte d'informations, sujets couverts, mention confidentielle. */
export function CRHeader({ data, theme }: { data: CRDecoratedData; theme: ReportTheme }): JSX.Element {
  const contact = data.contact ? `${data.contact.name}${data.contact.job_title ? ` (${data.contact.job_title})` : ''}` : 'Non précisé'
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: theme.primary }}>Compte-rendu d&rsquo;entretien</Text>
      <Text style={{ fontSize: 11, color: theme.muted, marginTop: 2, marginBottom: 8 }}>{data.interview.title}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderWidth: 0.5, borderColor: theme.border, borderRadius: 3, padding: 10 }}>
        <InfoField label="DATE" value={data.dateStr} theme={theme} />
        <InfoField label="AUDITEUR" value={data.auditorName} theme={theme} />
        <InfoField label="HORAIRE" value={data.timeRange} theme={theme} />
        <InfoField label="INTERLOCUTEUR" value={contact} theme={theme} />
        <InfoField label="LIEU" value={data.interview.location ?? 'Non précisé'} theme={theme} />
        <InfoField label="MISSION" value={data.missionName} theme={theme} />
      </View>
      {data.controlCodes.length > 0 ? (
        <View style={{ backgroundColor: '#f0fdf4', borderRadius: 2, padding: 6, marginTop: 6 }}>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: theme.primary }}>Sujets couverts : {data.controlCodes.join(' · ')}</Text>
        </View>
      ) : null}
      <View style={{ backgroundColor: '#fdf8e8', borderRadius: 2, padding: 6, marginTop: 6 }}>
        <Text style={{ fontSize: 7.5, color: theme.accent }}><Text style={{ fontFamily: 'Helvetica-Bold' }}>CONFIDENTIEL</Text> : document de travail d&rsquo;audit, usage interne uniquement.</Text>
      </View>
    </View>
  )
}

/** Bandeau de section du CR (pas de numerotation, conforme au moteur v1). */
export function CRSectionHeader({ title, lead, theme }: { title: string; lead?: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ marginBottom: 6, marginTop: 4 }} wrap={false}>
      <View style={{ backgroundColor: theme.primary, borderRadius: 2, paddingVertical: 4, paddingHorizontal: 8 }}>
        <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{title.toUpperCase()}</Text>
      </View>
      {lead ? <Text style={{ fontSize: 8, color: theme.muted, marginTop: 2 }}>{lead}</Text> : null}
    </View>
  )
}

/** Ligne a pastille (point positif ✓ / point d'attention !). */
export function IconLine({ text, color, icon }: { text: string; color: string; icon: string }): JSX.Element {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }} wrap={false}>
      <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: color, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginTop: 1 }}>
        <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{icon}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.4, color: '#374151' }}>{text}</Text>
    </View>
  )
}

/** Ligne numerotee (constats, actions). */
export function NumberedLine({ num, text, theme }: { num: number; text: string; theme: ReportTheme }): JSX.Element {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }} wrap={false}>
      <View style={{ width: 13, height: 13, borderRadius: 2, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
        <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>{num}</Text>
      </View>
      <Text style={{ flex: 1, fontSize: 9, lineHeight: 1.4, color: '#374151' }}>{text}</Text>
    </View>
  )
}

/** Cartouches de signature (auditeur + interlocuteur). */
export function SignatureBoxes({ auditorName, contactName, theme }: { auditorName: string; contactName: string; theme: ReportTheme }): JSX.Element {
  const box = (role: string, name: string): JSX.Element => (
    <View style={{ flex: 1, borderWidth: 0.5, borderColor: theme.border, borderRadius: 2, padding: 8, minHeight: 70 }}>
      <Text style={{ fontSize: 8, color: theme.muted }}>{role}</Text>
      <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: theme.ink, marginTop: 4 }}>{name}</Text>
      <View style={{ marginTop: 'auto', borderTopWidth: 0.5, borderTopColor: theme.border, paddingTop: 4 }}>
        <Text style={{ fontSize: 7, color: '#9ca3af' }}>Date et signature</Text>
      </View>
    </View>
  )
  return <View style={{ flexDirection: 'row', gap: 10 }}>{box('Auditeur', auditorName)}{box('Interlocuteur', contactName)}</View>
}
