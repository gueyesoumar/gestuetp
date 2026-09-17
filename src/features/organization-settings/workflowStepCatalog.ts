// Catalogue des étapes désélectionnables d'un template de parcours (RFC 0009).
// DOIT rester synchro avec le CHECK liste blanche de la migration 00252.
export interface StepDef { key: string; label: string; hint?: string }
export interface StepGroup { title: string; steps: StepDef[] }

export const WORKFLOW_STEP_GROUPS: StepGroup[] = [
  {
    title: 'Cadrage — sous-étapes',
    steps: [
      { key: 'scoping.risks', label: 'Risques', hint: 'Déjà masqué en moteur Contrôle' },
      { key: 'scoping.questionnaire', label: 'Questionnaire' },
      { key: 'scoping.documents', label: 'Documents' },
      { key: 'scoping.actors', label: 'Acteurs' },
    ],
  },
  {
    title: 'Planification — sous-étapes',
    steps: [
      { key: 'planning.interviews', label: 'Entretiens', hint: 'Onglet entretiens + matrice' },
    ],
  },
  {
    title: 'Revue interne — sous-étapes',
    steps: [
      { key: 'review.quality', label: 'Synthèse qualité' },
      { key: 'review.discussion', label: 'Panneau de discussion' },
    ],
  },
  {
    title: 'Clôture — sous-étapes',
    steps: [
      { key: 'closure.report', label: 'Générateur de rapport avancé' },
    ],
  },
  {
    title: 'Phases optionnelles',
    steps: [
      { key: 'client_review', label: 'Validation client', hint: 'La revue mène directement à la clôture' },
      { key: 'action_plan', label: "Plan d'action" },
    ],
  },
]

export const ALL_DESELECTABLE_KEYS: string[] = WORKFLOW_STEP_GROUPS.flatMap((g) => g.steps.map((s) => s.key))
