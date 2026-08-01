import type { MissionMemberRow } from '../../missions/useMissionDetail'

const CONFORMITY_WEIGHTS: Record<string, number> = { c: 100, lc: 75, pc: 50, nc: 0 }

export const conformityWeight = (level: string | null | undefined): number | null => {
  if (level && level in CONFORMITY_WEIGHTS) return CONFORMITY_WEIGHTS[level]
  return null
}

export function memberName(m: MissionMemberRow): string {
  const u = (m as unknown as { user?: { first_name?: string; last_name?: string } }).user
  return u ? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || '—' : '—'
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatPeriodShort(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return '—'
  const fmt = (iso: string | null | undefined): string => iso
    ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—'
  return `${fmt(start)} – ${fmt(end)}`
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…'
}

export function statusLabel(s: string): string {
  switch (s) {
    case 'draft': return 'Brouillon'
    case 'submitted': return 'Soumis'
    case 'in_review': return 'En revue'
    case 'approved': return 'Validé'
    case 'rejected': return 'Rejeté'
    default: return s
  }
}
