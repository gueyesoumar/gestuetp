import type { VendorListItem } from './useVendors'
import { QualificationBadge, CriticalityBadge } from './vendorBadges'
import { dataAccessLabel } from './vendorLabels'
import { expiryState, EXPIRY_STYLE, EXPIRY_LABEL } from './vendorExpiry'

/** Tableau du registre des tiers : qualification + echeance + relance (RFC 0020 Lot 4). */
export function VendorRegisterTable({ rows, onSelect }: { rows: VendorListItem[]; onSelect: (v: VendorListItem) => void }): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-[13px]">
        <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500">
          <tr>
            <th className="text-left px-4 py-3 font-semibold">Fournisseur</th>
            <th className="text-left px-4 py-3 font-semibold">Secteur</th>
            <th className="text-left px-4 py-3 font-semibold">Accès données</th>
            <th className="text-left px-4 py-3 font-semibold">Criticité</th>
            <th className="text-left px-4 py-3 font-semibold">Qualification</th>
            <th className="text-left px-4 py-3 font-semibold">Échéance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((v) => {
            const state = expiryState(v.next_assessment_at)
            const due = v.next_assessment_at ? new Date(v.next_assessment_at).toLocaleDateString('fr-FR') : '-'
            return (
              <tr key={v.relationship_id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onSelect(v)}>
                <td className="px-4 py-3 font-medium text-gray-900">{v.name}{v.services && <span className="block text-[11px] text-gray-400 font-normal">{v.services}</span>}</td>
                <td className="px-4 py-3 text-gray-500">{v.sector ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{dataAccessLabel(v.data_access_level)}</td>
                <td className="px-4 py-3"><CriticalityBadge value={v.criticality} /></td>
                <td className="px-4 py-3"><QualificationBadge status={v.qualification_status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${EXPIRY_STYLE[state]}`}>{EXPIRY_LABEL[state]}</span>
                    <span className="text-[12px] text-gray-400">{due}</span>
                    {(state === 'expired' || state === 'soon') && (
                      <button onClick={(e) => { e.stopPropagation(); onSelect(v) }} className="text-[11px] font-semibold text-forest-700 hover:underline">Relancer</button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
