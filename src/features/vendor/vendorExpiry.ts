/** Etat d'echeance d'une qualification, derive cote client de la date de prochaine
 *  evaluation (aucun backend, aucune donnee nouvelle) - RFC 0020 Lot 4. */
export type ExpiryState = 'expired' | 'soon' | 'ok' | 'none'

export const EXPIRY_SOON_DAYS = 60

export function daysUntil(nextAssessmentAt: string): number {
  return Math.floor((new Date(nextAssessmentAt).getTime() - Date.now()) / 86400000)
}

export function expiryState(nextAssessmentAt: string | null): ExpiryState {
  if (!nextAssessmentAt) return 'none'
  const due = new Date(nextAssessmentAt)
  if (Number.isNaN(due.getTime())) return 'none'
  const days = daysUntil(nextAssessmentAt)
  if (days < 0) return 'expired'
  if (days <= EXPIRY_SOON_DAYS) return 'soon'
  return 'ok'
}

export const EXPIRY_STYLE: Record<ExpiryState, string> = {
  expired: 'bg-red-50 text-red-600',
  soon: 'bg-amber-50 text-amber-700',
  ok: 'bg-green-50 text-green-700',
  none: 'bg-gray-100 text-gray-400',
}

export const EXPIRY_LABEL: Record<ExpiryState, string> = {
  expired: 'Expirée',
  soon: 'Expire bientôt',
  ok: 'À jour',
  none: 'Non évalué',
}

export const EXPIRY_FILTER_OPTIONS = [
  { value: 'expired', label: 'Expirées' },
  { value: 'soon', label: 'Expirent bientôt' },
  { value: 'ok', label: 'À jour' },
  { value: 'none', label: 'Non évalués' },
] as const
