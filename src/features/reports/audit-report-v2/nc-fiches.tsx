import { View, Text } from '@react-pdf/renderer'
import { generateNCFactSheet } from '../auditReportNarratives'
import { statusLabel } from '../audit-report/utils'
import { SectionBanner, Field } from './components'
import type { SectionProps } from './sections'

// Section 05. D-REP-5 : on affiche le RISQUE REEL (assessment_findings.risk, via
// a.risk_notes) et on RETIRE la « cause racine » et l'« impact » generes par
// heuristique (textes fabriques, hors donnees) du moteur v1.
export function NCFactSheetsSection({ data, theme, num, title, lead, options }: SectionProps): JSX.Element {
  const fiches = data.assessments.filter((a) => a.finding_classification === 'major_nc')
  const showRisk = options.showRisk !== false
  return (
    <View>
      <SectionBanner num={num} title={title} lead={lead} theme={theme} />
      {fiches.length === 0 ? (
        <Text style={{ fontSize: 10, color: theme.muted }}>Aucune non-conformité majeure relevée au cours de la mission.</Text>
      ) : (
        fiches.map((a, i) => {
          const sheet = generateNCFactSheet(a, data)
          const risk = (a.risk_notes ?? '').trim()
          return (
            <View key={a.id} style={{ marginBottom: 12 }}>
              <View style={{ backgroundColor: '#b91c1c', padding: 8 }} wrap={false}>
                <Text style={{ fontSize: 8, color: '#ffffff', fontFamily: 'Helvetica-Bold' }}>FICHE NC MAJEURE {'·'} {i + 1}/{fiches.length}</Text>
                <Text style={{ fontSize: 11, color: '#ffffff', fontFamily: 'Helvetica-Bold', marginTop: 2 }}>{a.control.code} : {a.control.name}</Text>
              </View>
              <View style={{ borderWidth: 0.5, borderColor: theme.border, borderTopWidth: 0, padding: 8 }}>
                <Field label="Exigence du référentiel" text={sheet.requirement} />
                <Field label="Constat d'audit" text={sheet.observation} color="#b91c1c" />
                <Field label="Éléments de preuve examinés" text={sheet.evidence} />
                {risk && showRisk ? <Field label="Risque identifié" text={risk} color="#c2410c" /> : null}
                <Field label="Recommandation" text={sheet.recommendation} color="#15803d" />
                <Field label="Justification de la classification" text={sheet.severityRationale} />
                <Text style={{ fontSize: 7.5, color: theme.muted, marginTop: 2 }}>
                  Classification : NC majeure (P1) {'·'} Statut : {statusLabel(a.status)}
                </Text>
              </View>
            </View>
          )
        })
      )}
    </View>
  )
}
