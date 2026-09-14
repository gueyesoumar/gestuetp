import { useState } from 'react'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { useCurrencyDisplay } from './useCurrencyDisplay'
import { useOrgEntitlements } from './useOrgEntitlements'
import { EntitlementRow } from './EntitlementRow'
import { EntitlementEditModal } from './EntitlementEditModal'
import { GrantManualModal } from './GrantManualModal'
import { EntitlementTemplates } from './EntitlementTemplates'
import type { OrgEntitlementEntry } from '../../../types/database.types'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 border-l border-gray-200 first:border-l-0">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{label}</div>
      <div className="text-[15px] font-bold text-gray-900 mt-1">{value}</div>
    </div>
  )
}

export function EntitlementConsole({ cabinetId }: { cabinetId: string }) {
  const { state, plans, loading, busy, act } = useOrgEntitlements(cabinetId)
  const { currency, setCurrency, format } = useCurrencyDisplay()
  const [editing, setEditing] = useState<OrgEntitlementEntry | null>(null)
  const [granting, setGranting] = useState(false)

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (!state) return null

  const ent = state.entitlements
  const counts = ent.reduce((a, e) => { a[e.status] = (a[e.status] ?? 0) + 1; return a }, {} as Record<string, number>)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {(['XOF', 'EUR', 'USD'] as const).map((c) => (
            <button key={c} onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 text-[12px] font-semibold ${currency === c ? 'bg-forest-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{c}</button>
          ))}
        </div>
        <button onClick={() => setGranting(true)}
          className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-forest-700 text-white rounded-lg text-[12.5px] font-semibold hover:bg-forest-900">
          + Octroyer un droit
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <Stat label="Accueil" value={state.home_product ?? '—'} />
        <Stat label="Remise org" value={`${state.discount_pct ?? 0} %`} />
        <Stat label="MRR net" value={format(state.mrr)} />
        <Stat label="Statuts" value={`${counts.active ?? 0} A · ${counts.trial ?? 0} E · ${counts.suspended ?? 0} S`} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-page-bg text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
              <th className="text-left px-4 py-3 border-b border-gray-200">Droit · source</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Statut</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Accès</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Prix</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Gate</th>
              <th className="px-4 py-3 border-b border-gray-200"></th>
            </tr>
          </thead>
          <tbody>
            {ent.length === 0
              ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-[13px]">Aucun entitlement</td></tr>
              : ent.map((e) => <EntitlementRow key={e.key} entry={e} format={format} onEdit={setEditing} />)}
          </tbody>
        </table>
      </div>

      <EntitlementTemplates plans={plans} busy={busy} onApply={(slug, reason) => act({ action: 'apply_template', plan_slug: slug, reason })} />

      <p className="text-[11px] text-gray-400">
        Appliquer un template sème les droits d&apos;un plan ; l&apos;édition affine prix, plafonds, gate et droits manuels.
      </p>

      {editing && <EntitlementEditModal entry={editing} busy={busy} onClose={() => setEditing(null)} onSubmit={act} />}
      {granting && <GrantManualModal busy={busy} onClose={() => setGranting(false)} onSubmit={act} />}
    </div>
  )
}
