import type { ScopingNoteData } from '../scoping-note/context'

// Jeu de données FACTICE pour l'aperçu live de l'éditeur (note de cadrage, RFC 0021
// E2.1). Données d'illustration : jamais persistées, jamais exposées. Cast unique
// justifié (on ne renseigne que les champs lus par le rendu). Accents réels.

const DOMAINS = [
  { id: 'd1', code: 'GOUV', name: 'Gouvernance de la sécurité', description: null, controls: [{ id: 'c1' }, { id: 'c2' }] },
  { id: 'd2', code: 'OPS', name: 'Sécurité des opérations', description: null, controls: [{ id: 'c3' }, { id: 'c4' }] },
  { id: 'd3', code: 'ACCES', name: 'Contrôle d\'accès', description: null, controls: [{ id: 'c5' }, { id: 'c6' }] },
]

export function buildSampleScopingData(): ScopingNoteData {
  const sample = {
    mission: {
      id: 'sample-mission', name: 'Audit SSI - Entité d\'illustration',
      start_date: '2026-03-02', end_date: '2026-05-15',
      framework: { name: 'PSSI-ES', version: '1' },
      cabinet: { name: 'Cabinet d\'audit' },
      client: { name: 'Entité d\'illustration' },
      audit_objectives: 'Atteindre un niveau de conformité cible sur les domaines critiques avant la fin de l\'exercice.',
      audit_criteria: 'Évaluation sur l\'échelle de maturité 0 à 5, seuil de conformité fixé au niveau 3.',
      scoping_notes: 'Cadrage validé en réunion de lancement du 2 mars 2026.',
    },
    members: [
      { id: 'm1', role: 'lead_auditor', user: { first_name: 'Awa', last_name: 'Ndiaye', email: 'awa.ndiaye@cabinet.sn', job_title: 'Auditrice principale' } },
      { id: 'm2', role: 'associate', user: { first_name: 'Moussa', last_name: 'Sarr', email: 'moussa.sarr@cabinet.sn', job_title: 'Associé' } },
    ],
    domains: DOMAINS,
    exclusions: [{ id: 'ex1', control_id: 'c6', reason: 'Système hors périmètre pour cet exercice.' }],
    risks: [
      { id: 'r1', title: 'Disponibilité des interlocuteurs', description: 'Risque de retard lié à la faible disponibilité des équipes métier en période de clôture.', risk_level: 'high' },
      { id: 'r2', title: 'Documentation incomplète', description: 'Certaines procédures ne sont pas formalisées.', risk_level: 'medium' },
    ],
    client: {
      client_name: 'Entité d\'illustration', client_sector: 'Administration publique', client_country: 'Sénégal',
      effectifs: '250 à 500', it_systems: ['Active Directory', 'Messagerie', 'ERP métier'],
      it_environment: 'Infrastructure hybride on-premise et cloud souverain.',
      exigences_reglementaires: [{ nom: 'Loi sur la protection des données', type: 'Légale', impact: 'eleve' }],
    },
    questionnaireProgress: 60, documentsReceived: 8, documentsExpected: 12,
    reviewLabels: { lead: 'Chef de mission', associate: 'Associé' },
  }
  // Cast unique justifié : données factices d'aperçu, seuls les champs lus par le rendu.
  return sample as unknown as ScopingNoteData
}
