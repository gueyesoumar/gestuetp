import { useState } from 'react'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { useCurrencyDisplay } from './useCurrencyDisplay'
import { useOrgEntitlements } from './useOrgEntitlements'
import { EntitlementGroup } from './EntitlementGroup'
import { EntitlementEditModal } from './EntitlementEditModal'
import { GrantManualModal } from './GrantManualModal'
import { EntitlementTemplates } from './EntitlementTemplates'
import { ReapplyPlanButton } from './ReapplyPlanButton'
import { classifyEntitlement } from '../../../lib/entitlements'
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
  const { state, plans, moduleCapabilities, loading, busy, act } = useOrgEntitlements(cabinetId)
  const { currency, setCurrency, format } = useCurrencyDisplay()
  const [editing, setEditing] = useState<OrgEntitlementEntry | null>(null)
  const [granting, setGranting] = useState(false)

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (!state) return null

  const ent = state.entitlements
  const counts = ent.reduce((a, e) => { a[e.status] = (a[e.status] ?? 0) + 1; return a }, {} as Record<string, number>)
  const modules = ent.filter((e) => classifyEntitlement(e, moduleCapabilities) === 'module')
  const features = ent.filter((e) => classifyEntitlement(e, moduleCapabilities) === 'feature')
  const quotas = ent.filter((e) => classifyEntitlement(e, moduleCapabilities) === 'quota')
  const others = ent.filter((e) => classifyEntitlement(e, moduleCapabilities) === 'other')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          {(['XOF', 'EUR', 'USD'] as const).map((c) => (
            <button key={c} onClick={() => setCurrency(c)}
              className={`px-3 py-1.5 text-[12px] font-semibold ${currency === c ? 'bg-forest-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{c}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ReapplyPlanButton busy={busy} onReapply={(reason) => act({ action: 'apply_plan', reason })} />
          <button onClick={() => setGranting(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-forest-700 text-white rounded-lg text-[12.5px] font-semibold hover:bg-forest-900">
            + Octroyer un droit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
        <Stat label="Accueil" value={state.home_product ?? '-'} />
        <Stat label="Remise organisation" value={`${state.discount_pct ?? 0} %`} />
        <Stat label="MRR net" value={format(state.mrr)} />
        <Stat label="Statuts" value={`${counts.active ?? 0} actifs · ${counts.trial ?? 0} essais · ${counts.suspended ?? 0} suspendus`} />
      </div>

      <EntitlementGroup title="Modules" subtitle="Produits activés pour cette organisation."
        rows={modules} format={format} onEdit={setEditing} emptyLabel="Aucun module actif" />

      {features.length > 0 && (
        <EntitlementGroup title="Fonctionnalités" subtitle="Fonctionnalités incluses dans un module (incidents, mesures, portail...)."
          rows={features} format={format} onEdit={setEditing} emptyLabel="Aucune" />
      )}

      <EntitlementGroup title="Quotas" subtitle="Plafonds d'usage (utilisateurs, missions)."
        rows={quotas} format={format} onEdit={setEditing} emptyLabel="Aucun quota défini" />

      {others.length > 0 && (
        <EntitlementGroup title="Autres droits" subtitle="Droits manuels (crédits, dérogations ponctuelles)."
          rows={others} format={format} onEdit={setEditing} emptyLabel="Aucun" />
      )}

      <EntitlementTemplates plans={plans} busy={busy} onApply={(slug, reason) => act({ action: 'apply_template', plan_slug: slug, reason })} />

      <p className="text-[11px] text-gray-400">
        « Réappliquer le plan » réaligne modules et quotas sur le plan ; l&apos;édition affine prix, plafonds, verrou et droits manuels.
      </p>

      {editing && <EntitlementEditModal entry={editing} busy={busy} onClose={() => setEditing(null)} onSubmit={act} />}
      {granting && <GrantManualModal busy={busy} onClose={() => setGranting(false)} onSubmit={act} />}
    </div>
  )
}
