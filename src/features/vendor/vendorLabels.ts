import { VENDOR_DATA_ACCESS_OPTIONS, VENDOR_CRITICALITY_OPTIONS, VENDOR_QUALIFICATION_OPTIONS } from '../../lib/constants'

const labelOf = (opts: readonly { value: string; label: string }[], v: string): string =>
  opts.find((o) => o.value === v)?.label ?? v

export const dataAccessLabel = (v: string): string => labelOf(VENDOR_DATA_ACCESS_OPTIONS, v)
export const criticalityLabel = (v: string): string => labelOf(VENDOR_CRITICALITY_OPTIONS, v)
export const qualificationLabel = (v: string): string => labelOf(VENDOR_QUALIFICATION_OPTIONS, v)

// Cotation de conformite par controle (reutilise la formule d'audit c/lc/pc/nc).
export const VENDOR_CONFORMITY = [
  { value: 'c', label: 'Conforme', score: 100 },
  { value: 'lc', label: 'Largement conforme', score: 75 },
  { value: 'pc', label: 'Partiellement conforme', score: 50 },
  { value: 'nc', label: 'Non conforme', score: 0 },
  { value: 'na', label: 'Sans objet', score: null },
] as const

const SCORE_OF: Record<string, number | null> = { c: 100, lc: 75, pc: 50, nc: 0, na: null }

/** Score de conformite (na / non cote exclus). Null si rien n'est cote. */
export function conformityScore(levels: (string | null)[]): number | null {
  const noted = levels.filter((l) => l != null && SCORE_OF[l] != null) as string[]
  if (noted.length === 0) return null
  return Math.round(noted.reduce((s, l) => s + (SCORE_OF[l] ?? 0), 0) / noted.length)
}

export function verdictOf(score: number): string {
  return score >= 80 ? 'qualifie' : score >= 60 ? 'qualifie_conditions' : 'non_qualifie'
}

export const QUALIFICATION_STYLE: Record<string, string> = {
  qualifie: 'bg-green-50 text-green-700',
  qualifie_conditions: 'bg-amber-50 text-amber-700',
  en_evaluation: 'bg-blue-50 text-blue-700',
  prospect: 'bg-gray-100 text-gray-500',
  non_qualifie: 'bg-red-50 text-red-600',
  suspendu: 'bg-red-50 text-red-600',
}
