import type { OrgEntitlementEntry } from '../../../types/database.types'

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  trial: 'bg-amber-50 text-amber-700',
  suspended: 'bg-red-50 text-red-600',
}
const STATUS_LABEL: Record<string, string> = { active: 'Actif', trial: 'Essai', suspended: 'Suspendu' }

interface Props {
  entry: OrgEntitlementEntry
  format: (xof: number) => string
  onEdit: (e: OrgEntitlementEntry) => void
}

export function EntitlementRow({ entry, format, onEdit }: Props) {
  const access = entry.limit_value != null
    ? <span className="text-gray-700">≤ <span className="font-semibold">{entry.limit_value}</span></span>
    : <span className="text-green-700 font-semibold">✓</span>

  const price = entry.pricing_kind === 'none' || entry.price_amount == null
    ? <span className="text-gray-400">inclus</span>
    : <span className="text-gray-900 font-medium">{format(entry.price_amount)}{entry.price_unit ? <span className="text-gray-400"> /{entry.price_unit}</span> : null}</span>

  return (
    <tr className="hover:bg-page-bg">
      <td className="px-4 py-3 border-b border-gray-100">
        <div className="font-semibold text-gray-900">{entry.key}</div>
        <div className="text-[11px] text-gray-400 font-mono">{entry.source}{entry.capability ? ` · ${entry.capability}` : ''}</div>
      </td>
      <td className="px-4 py-3 border-b border-gray-100">
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLE[entry.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {STATUS_LABEL[entry.status] ?? entry.status}
          {entry.status === 'trial' && entry.trial_ends_at ? ` · ${new Date(entry.trial_ends_at).toLocaleDateString('fr-FR')}` : ''}
        </span>
      </td>
      <td className="px-4 py-3 border-b border-gray-100 text-[13px]">{access}</td>
      <td className="px-4 py-3 border-b border-gray-100 text-[13px]">{price}</td>
      <td className="px-4 py-3 border-b border-gray-100">
        {entry.enforcement === 'hard'
          ? <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">🔒 Dur</span>
          : <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">Souple</span>}
      </td>
      <td className="px-4 py-3 border-b border-gray-100 text-right">
        <button onClick={() => onEdit(entry)} className="text-forest-700 text-[12px] font-semibold hover:text-forest-900">Éditer</button>
      </td>
    </tr>
  )
}
