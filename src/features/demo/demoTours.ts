import type { TourDef } from '../support/onboarding/tourDefs'

// Parcours de découverte assistée (RFC 0011 · Lot C). Chaque étape = un tour guidé
// (moteur driver.js réutilisé) sur les données de démonstration, narré par Doudou.
// Étapes robustes : routes connues + ancres degrade-safe (le moteur recentre l'étape
// si l'élément est absent). Progression persistée dans onboarding_tours_seen.

export interface DiscoveryStep { id: string; title: string; desc: string }

export const DISCOVERY_STEPS: DiscoveryStep[] = [
  { id: 'demo-dashboard', title: 'Le tableau de bord & votre score', desc: 'Voyez le score de confiance « prendre vie ».' },
  { id: 'demo-mission', title: 'Une mission de A à Z', desc: 'Cadrage → planification → terrain → constats → clôture.' },
  { id: 'demo-findings', title: 'Les constats par gravité', desc: 'Comment naissent et se classent les findings.' },
  { id: 'demo-risk', title: 'Le radar de risques', desc: 'Le registre des risques et sa lecture.' },
  { id: 'demo-clients', title: 'Le portail client', desc: 'Ce que voit votre client, cloisonné.' },
  { id: 'demo-create', title: 'Créez votre propre mission', desc: "La transition vers l'usage réel, guidée." },
]

export const DEMO_TOUR_DEFS: Record<string, TourDef> = {
  'demo-dashboard': {
    route: '/',
    steps: [
      { popover: { title: 'Votre tableau de bord', description: "Avec les données d'exemple, votre score de confiance et vos indicateurs sont renseignés. Activez « Inclure la démo dans mes indicateurs » (pastille Mode démo) pour tout voir prendre vie." } },
    ],
  },
  'demo-mission': {
    route: '/missions',
    steps: [
      { element: '[data-tour="missions-header"]', popover: { title: '3 missions d\'exemple', description: 'Vous avez 3 missions à des stades différents. Ouvrez celle en clôture pour parcourir le workflow complet : cadrage, planification, terrain, revue, clôture.' } },
    ],
  },
  'demo-findings': {
    steps: [
      { popover: { title: 'Les constats', description: "Dans l'onglet Terrain d'une mission, chaque contrôle évalué génère des constats (findings) classés par gravité. Ils alimentent le rapport et le score." } },
    ],
  },
  'demo-risk': {
    steps: [
      { popover: { title: 'Le radar de risques', description: "L'espace d'exemple contient un registre de risques. Il se lit comme un radar : chaque axe est un scénario, coté selon son impact et sa probabilité." } },
    ],
  },
  'demo-clients': {
    route: '/clients',
    steps: [
      { element: '[data-tour="clients-header"]', popover: { title: 'Le portail client', description: "Un client de démonstration est présent. Depuis sa fiche, vous invitez son contact : il accède à un portail cloisonné à ses seules données." } },
    ],
  },
  'demo-create': {
    route: '/missions',
    steps: [
      { element: '[data-tour="new-mission"]', popover: { title: 'À vous de jouer', description: "Prêt ? Lancez votre propre mission avec « Nouvelle mission » — l'assistant vous guide en 6 étapes. Vous pourrez supprimer la démo quand vous voulez.", side: 'bottom', align: 'end' } },
    ],
  },
}
