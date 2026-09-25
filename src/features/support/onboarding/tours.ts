// Registre des tours guidés (RFC 0011). Les tours Shepherd seront branchés au Lot 3 :
// launchTour émet un événement que le moteur de tours (à venir) écoutera. En attendant,
// le bouton reste visible et testable côté widget (Lot 2).

export const TOUR_LABELS: Record<string, string> = {
  'hub-overview': 'Découvrir le Hub ETP',
  'create-mission': 'Créer une mission',
  'mission-planning': 'Planifier une mission',
  fieldwork: 'Réaliser le travail de terrain',
  'client-portal': 'Utiliser le portail client',
}

export function tourLabel(id: string): string {
  return TOUR_LABELS[id] ?? 'Lancer le tour guidé'
}

export function launchTour(id: string): void {
  window.dispatchEvent(new CustomEvent('onboarding:tour', { detail: id }))
}
