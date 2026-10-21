import { AlertTriangle } from 'lucide-react'
import type { VendorListItem } from './useVendors'
import { expiryState } from './vendorExpiry'

/** Bandeau de tete : compte les qualifications expirees / proches de l'echeance (RFC 0020 Lot 4). */
export function VendorExpiryAlert({ rows }: { rows: VendorListItem[] }): JSX.Element | null {
  const expired = rows.filter((v) => expiryState(v.next_assessment_at) === 'expired').length
  const soon = rows.filter((v) => expiryState(v.next_assessment_at) === 'soon').length
  if (expired === 0 && soon === 0) return null

  const parts: string[] = []
  if (expired > 0) parts.push(`${expired} qualification${expired > 1 ? 's' : ''} expirée${expired > 1 ? 's' : ''}`)
  if (soon > 0) parts.push(`${soon} arrive${soon > 1 ? 'nt' : ''} à échéance (sous ${60} jours)`)

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertTriangle size={17} className="text-amber-600 shrink-0 mt-0.5" />
      <p className="text-[13px] text-amber-800">{parts.join(' et ')}. Relancez une évaluation pour maintenir la qualification à jour.</p>
    </div>
  )
}
