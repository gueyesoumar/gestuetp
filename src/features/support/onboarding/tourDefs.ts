// Tours guidés déclaratifs (RFC 0011, Lot 3, décision C = driver.js/MIT).
// Chaque tour = une séquence d'étapes. `element` (sélecteur data-tour) ancre l'étape à
// un élément réel ; sans `element`, driver.js affiche une carte centrée. `route` fait
// naviguer vers la page attendue avant de dérouler (ancrage fiable).

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
      { popover: { title: 'Créer une mission', description: "Voici comment lancer une nouvelle mission d'audit ou de contrôle." } },
      { element: '[data-tour="new-mission"]', popover: { title: 'Nouvelle mission', description: "Cliquez ici, puis suivez l'assistant : type → client → périmètre → équipe → calendrier → confirmation.", side: 'bottom', align: 'end' } },
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
      { popover: { title: 'Portail client', description: "Créez le client puis invitez son contact : il suivra ses missions et échangera les documents dans un espace cloisonné à ses propres données." } },
    ],
  },
}
