import type { AuditReportData } from '../generateAuditReportPDF'

// Jeu de données FACTICE pour l'aperçu live de l'éditeur de modèles (RFC 0021 D1).
// Données d'illustration uniquement : jamais persistées, jamais exposées. Un seul
// cast justifié suffit car on ne renseigne que les champs lus par le rendu (mission,
// client, membres, domaines, évaluations, constats), pas tout le graphe MissionDetail.

interface SampleControl { id: string; code: string; name: string; description: string | null; domain_id: string }

function control(id: string, code: string, name: string, domainId: string): SampleControl {
  return { id, code, name, description: null, domain_id: domainId }
}

function assessment(
  id: string, ctrl: SampleControl, level: string,
  classification: string | null, findings: string | null, reco: string | null, risk: string | null,
): Record<string, unknown> {
  return {
    id, control_id: ctrl.id, control: ctrl,
    conformity_level: level, finding_classification: classification,
    findings, recommendations: reco, risk_notes: risk, findings_list: [],
    status: classification ? 'open' : 'closed',
  }
}

const DOMAINS = [
  { id: 'd1', code: 'GOUV', name: 'Gouvernance de la sécurité', description: 'Pilotage et organisation de la SSI.' },
  { id: 'd2', code: 'OPS', name: 'Sécurité des opérations', description: 'Exploitation, journalisation, sauvegardes.' },
  { id: 'd3', code: 'ACCES', name: 'Contrôle d\'accès', description: 'Gestion des identités et des habilitations.' },
]

const C = {
  gouv1: control('c1', 'GOUV-01', 'Politique de sécurité du SI', 'd1'),
  gouv2: control('c2', 'GOUV-02', 'Analyse de risque annuelle', 'd1'),
  ops1: control('c3', 'OPS-01', 'Sauvegardes régulières et testées', 'd2'),
  ops2: control('c4', 'OPS-02', 'Journalisation centralisée', 'd2'),
  acc1: control('c5', 'ACCES-01', 'Revue périodique des habilitations', 'd3'),
  acc2: control('c6', 'ACCES-02', 'Authentification forte des administrateurs', 'd3'),
}

const ASSESSMENTS = [
  assessment('a1', C.gouv1, 'c', null, null, null, null),
  assessment('a2', C.gouv2, 'pc', 'minor_nc',
    'L\'analyse de risque existe mais n\'a pas été actualisée depuis dix-huit mois.',
    'Reconduire l\'analyse de risque sur une cadence annuelle et la faire valider par la direction.', null),
  assessment('a3', C.ops1, 'lc', 'observation',
    'Les sauvegardes sont réalisées quotidiennement ; les tests de restauration restent informels.',
    'Formaliser un plan de test de restauration semestriel avec procès-verbal.', null),
  assessment('a4', C.ops2, 'nc', 'major_nc',
    'Aucune centralisation des journaux : les traces sont conservées localement sur chaque serveur.',
    'Déployer un collecteur centralisé avec rétention de douze mois et alerting.',
    'Absence de détection en cas d\'incident et impossibilité d\'investigation a posteriori.'),
  assessment('a5', C.acc1, 'pc', 'minor_nc',
    'Les revues d\'habilitations sont conduites sans traçabilité formelle.',
    'Outiller la revue trimestrielle et conserver les preuves de validation.', null),
  assessment('a6', C.acc2, 'c', null, null, null, null),
]

const MEMBERS = [
  { id: 'm1', role: 'lead_auditor', user: { first_name: 'Awa', last_name: 'Ndiaye', job_title: 'Auditrice principale' } },
  { id: 'm2', role: 'auditor', user: { first_name: 'Moussa', last_name: 'Sarr', job_title: 'Auditeur' } },
]

/** Construit un rapport d'illustration ; l'appelant injecte templateSections/templateTexts. */
export function buildSampleReportData(): AuditReportData {
  const sample = {
    mission: {
      id: 'sample-mission', name: 'Audit SSI - Entité d\'illustration',
      description: 'Audit de conformité du système d\'information mené à des fins de démonstration.',
      start_date: '2026-03-02', end_date: '2026-03-20',
      framework: { name: 'PSSI-ES' },
    },
    members: MEMBERS,
    domains: DOMAINS.map((d) => ({ ...d, controls: ASSESSMENTS.filter((a) => (a.control as SampleControl).domain_id === d.id).map((a) => ({ id: a.control_id })) })),
    assessments: ASSESSMENTS,
    client: { client_name: 'Entité d\'illustration', client_sector: 'Administration publique' },
    clientContacts: [{ id: 'cc1', contact_name: 'Fatou Fall', email: 'contact@illustration.sn', job_title: 'RSSI', portal_status: 'active' }],
    cabinetName: 'Cabinet d\'audit',
    cabinetLogoUrl: null, cabinetLogoDarkUrl: null,
    cabinetAddress: null, cabinetPhone: null, cabinetWebsite: null, cabinetSupportEmail: null,
    cabinetFooterText: null, cabinetPrimaryColor: null, cabinetAccentColor: null,
    evidenceDocs: [
      { id: 'e1', file_name: 'Politique_SSI_v3.pdf', document_type: 'Politique', created_at: '2026-03-05' },
      { id: 'e2', file_name: 'Registre_sauvegardes.xlsx', document_type: 'Preuve', created_at: '2026-03-10' },
    ],
  }
  // Cast unique justifié : données factices d'aperçu, on ne renseigne que les champs
  // lus par le rendu (cf. trace des accès data.* du moteur v2).
  return sample as unknown as AuditReportData
}
