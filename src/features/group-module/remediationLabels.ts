/** Libellés + styles partagés des constats et plans d'action (onglets du dossier assujetti). */

export const CLASS_LABEL: Record<string, { label: string; cls: string }> = {
  major_nc: { label: 'NC majeure', cls: 'bg-red-50 text-red-700' },
  minor_nc: { label: 'NC mineure', cls: 'bg-amber-50 text-amber-700' },
  observation: { label: 'Observation', cls: 'bg-gray-100 text-gray-600' },
  strength: { label: 'Point fort', cls: 'bg-green-50 text-green-700' },
}

export const PRIORITY_LABEL: Record<string, string> = {
  critical: 'Critique', high: 'Élevée', medium: 'Moyenne', low: 'Faible',
}

export const CAR_STATUS_LABEL: Record<string, string> = {
  open: 'Ouverte', client_responded: 'Réponse reçue', verified: 'Vérifiée', closed: 'Clôturée',
}

export const CAR_VERIF_LABEL: Record<string, string> = {
  pending: 'En attente', accepted: 'Acceptée', rejected: 'Rejetée',
}

export const classOf = (c: string): { label: string; cls: string } =>
  CLASS_LABEL[c] ?? { label: c, cls: 'bg-gray-100 text-gray-600' }
