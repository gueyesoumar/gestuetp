// Tours guidés déclaratifs (RFC 0011, Lot 3, décision C = driver.js/MIT).
// Chaque tour = une séquence d'étapes. `element` (sélecteur data-tour) ancre l'étape à
// un élément réel ; `route` fait naviguer vers la page attendue avant de dérouler.
//
// Anti-hallucination : le moteur (OnboardingTours) vérifie l'existence de chaque
// `element` au moment du tour ; s'il est absent (page vide, permission manquante), l'étape
// bascule automatiquement en carte centrée. On peut donc ancrer largement sans risque.

export interface TourStep {
  element?: string
  popover: { title: string; description: string; side?: 'top' | 'right' | 'bottom' | 'left'; align?: 'start' | 'center' | 'end' }
}
export interface TourDef { route?: string; steps: TourStep[] }

export const TOUR_DEFS: Record<string, TourDef> = {
  'hub-overview': {
    steps: [
      { popover: { title: 'Bienvenue 👋', description: "Petit tour rapide de l'espace de travail. Vous pourrez le relancer à tout moment depuis l'assistant." } },
      { element: '[data-tour="sidebar-nav"]', popover: { title: 'Votre navigation', description: "Vos modules sont ici : missions, référentiels et, selon vos droits, l'organisation.", side: 'right', align: 'start' } },
      { element: '[data-tour="hub-link"]', popover: { title: 'Hub ETP', description: 'Revenez au Hub à tout moment pour changer de module.', side: 'right', align: 'start' } },
      { element: '[data-tour="onboarding-bubble"]', popover: { title: 'Votre assistant', description: "Reposez-moi une question « comment faire X » quand vous voulez.", side: 'left', align: 'end' } },
    ],
  },
  'create-mission': {
    route: '/missions',
    steps: [
      { element: '[data-tour="missions-header"]', popover: { title: 'Le module Missions', description: "C'est ici que vous gérez toutes vos missions d'audit et de conformité." } },
      { element: '[data-tour="new-mission"]', popover: { title: 'Nouvelle mission', description: "Cliquez ici, puis suivez l'assistant : type → client → périmètre → équipe → calendrier → confirmation.", side: 'bottom', align: 'end' } },
    ],
  },
  'missions-views': {
    route: '/missions',
    steps: [
      { element: '[data-tour="missions-views"]', popover: { title: 'Vos vues', description: 'Basculez entre Kanban, Split et Cartes selon votre façon de travailler. Votre choix est mémorisé.', side: 'bottom', align: 'end' } },
    ],
  },
  frameworks: {
    route: '/referentiels',
    steps: [
      { element: '[data-tour="frameworks-header"]', popover: { title: 'Les référentiels', description: "Les cadres de conformité disponibles (ISO 27001, RGPD, PSSI-ES…). Ils structurent l'évaluation de vos missions." } },
    ],
  },
  'setup-2fa': {
    route: '/compte?tab=securite',
    steps: [
      { element: '[data-tour="twofa-section"]', popover: { title: 'Sécurité & 2FA', description: "La double authentification est requise sur tous les comptes. Gérez vos authentificateurs ici." } },
      { element: '[data-tour="twofa-add"]', popover: { title: 'Ajouter un authentificateur', description: "Cliquez ici, nommez l'appareil, scannez le QR code puis saisissez le code à 6 chiffres.", side: 'top', align: 'start' } },
    ],
  },
  'invite-member': {
    route: '/organisation?tab=membres',
    steps: [
      { element: '[data-tour="members-header"]', popover: { title: 'Les membres', description: "Gérez les membres de votre organisation et leurs rôles." } },
      { element: '[data-tour="invite-member"]', popover: { title: 'Inviter un membre', description: "Renseignez l'email et le rôle : un lien d'invitation est envoyé automatiquement.", side: 'bottom', align: 'end' } },
    ],
  },
  'manage-clients': {
    route: '/clients',
    steps: [
      { element: '[data-tour="clients-header"]', popover: { title: 'Vos clients', description: 'Votre portefeuille de clients. Chaque client peut ensuite accéder à son portail cloisonné.' } },
      { element: '[data-tour="new-client"]', popover: { title: 'Nouveau client', description: "Créez un client ici, puis invitez son contact au portail depuis sa fiche.", side: 'bottom', align: 'end' } },
    ],
  },
  supervision: {
    route: '/supervision',
    steps: [
      { element: '[data-tour="supervision-header"]', popover: { title: 'Supervision', description: "Le tableau de bord de supervision : suivez vos indicateurs et générez le rapport." } },
    ],
  },
  'mission-planning': {
    steps: [
      { popover: { title: 'Planifier une mission', description: "Dans l'onglet Planification d'une mission : sélectionnez les contrôles, affectez l'équipe et posez le calendrier. Les acteurs se saisissent ici." } },
    ],
  },
  fieldwork: {
    steps: [
      { popover: { title: 'Travail de terrain', description: "Dans l'onglet Terrain : évaluez chaque contrôle, saisissez vos constats et demandez les preuves nécessaires." } },
    ],
  },
  'client-portal': {
    steps: [
      { popover: { title: 'Portail client', description: "Depuis la fiche d'un client, invitez son contact : il suivra ses missions et échangera les documents dans un espace cloisonné à ses propres données." } },
    ],
  },
}
