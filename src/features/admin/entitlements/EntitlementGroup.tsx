import type { OrgEntitlementEntry } from '../../../types/database.types'
import { EntitlementRow } from './EntitlementRow'

interface Props {
  title: string
  subtitle: string
  rows: OrgEntitlementEntry[]
  format: (xof: number) => string
  onEdit: (e: OrgEntitlementEntry) => void
  emptyLabel: string
}

/** Un groupe de droits (Modules / Quotas / Autres) rendu en table. */
export function EntitlementGroup({ title, subtitle, rows, format, onEdit, emptyLabel }: Props) {
  return (
    <section>
      <header className="mb-2">
        <h3 className="text-[13.5px] font-bold text-gray-900 flex items-center gap-2">
          {title}
          <span className="text-[11px] font-mono text-gray-400">{rows.length}</span>
        </h3>
        <p className="text-[11.5px] text-gray-500">{subtitle}</p>
      </header>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-page-bg text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
              <th className="text-left px-4 py-3 border-b border-gray-200">Droit · source</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Statut</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Accès</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Prix</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Verrou</th>
              <th className="px-4 py-3 border-b border-gray-200"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-[12.5px]">{emptyLabel}</td></tr>
              : rows.map((e) => <EntitlementRow key={e.key} entry={e} format={format} onEdit={onEdit} />)}
          </tbody>
        </table>
      </div>
    </section>
  )
}
