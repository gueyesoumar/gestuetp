import { useState } from 'react'
import { Info, Power } from 'lucide-react'
import type { AdminPlan } from './useAdminPlans'
import { useFeatureCatalog, type FeatureCatalogItem, type FeatureCategory } from './useFeatureCatalog'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { useToast } from '../../../hooks/useToast'
import { toggleGlobalFlag } from '../featureFlags/toggleGlobalFlag'
import { KillSwitchModal } from '../featureFlags/KillSwitchModal'

interface PlansMatrixViewProps {
  plans: AdminPlan[]
  featuresByPlan: Map<string, Set<string>>
  onSetFeatures: (planId: string, flagIds: string[], reason: string) => Promise<{ ok: boolean; error?: string }>
}

export function PlansMatrixView({ plans, featuresByPlan, onSetFeatures }: PlansMatrixViewProps): JSX.Element {
  const { groups, loading, refetch: refetchCatalog } = useFeatureCatalog()
  const [reason, setReason] = useState('')
  const [savingPlans, setSavingPlans] = useState<Set<string>>(new Set())
  const [pendingKill, setPendingKill] = useState<{ item: FeatureCatalogItem; nextEnabled: boolean } | null>(null)
  const toast = useToast()

  if (loading) return <div className="py-12 flex justify-center"><LoadingSpinner /></div>

  const handlePlanToggle = async (planId: string, flagId: string): Promise<void> => {
    if (!reason.trim()) {
      toast.error('Motif requis', { description: 'Saisissez un motif global avant de modifier la matrice.' })
      return
    }
    if (savingPlans.has(planId)) return

    const current = featuresByPlan.get(planId) ?? new Set<string>()
    const next = new Set(current)
    if (next.has(flagId)) next.delete(flagId)
    else next.add(flagId)

    setSavingPlans((prev) => new Set(prev).add(planId))
    const res = await onSetFeatures(planId, [...next], reason)
    setSavingPlans((prev) => { const n = new Set(prev); n.delete(planId); return n })
    if (!res.ok) toast.error('Modification impossible', { description: res.error })
  }

  const handleKillConfirm = async (motif: string): ReturnType<typeof toggleGlobalFlag> => {
    if (!pendingKill) return { ok: false, error: 'Aucune action en attente' }
    const res = await toggleGlobalFlag(pendingKill.item.slug, pendingKill.nextEnabled, motif)
    if (res.ok) {
      toast.success(pendingKill.nextEnabled ? 'Activée globalement' : 'Désactivée globalement', { description: pendingKill.item.name })
      refetchCatalog()
    }
    return res
  }

  return (
    <div className="space-y-3">
      <ReasonBar reason={reason} setReason={setReason} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-[11px] uppercase tracking-wider font-bold text-gray-500 px-5 py-3 sticky left-0 bg-gray-50">
                Fonctionnalité
              </th>
              <th className="text-center text-[11px] uppercase tracking-wider font-bold text-red-700 px-3 py-3 w-24 bg-red-50/40 border-r-2 border-red-100">
                <div className="flex flex-col items-center gap-0.5">
                  <Power size={13} className="mb-0.5" />
                  <span>Global</span>
                  <span className="text-[9.5px] font-normal normal-case text-red-600 tracking-normal">kill switch</span>
                </div>
              </th>
              {plans.map((p) => <PlanHeaderCell key={p.id} plan={p} saving={savingPlans.has(p.id)} />)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-[12.5px]">
            {groups.map((group) => (
              <CategorySection
                key={group.category}
                label={group.label}
                category={group.category}
                items={group.items}
                plans={plans}
                featuresByPlan={featuresByPlan}
                onPlanToggle={handlePlanToggle}
                onKillToggle={(item) => setPendingKill({ item, nextEnabled: !item.is_globally_enabled })}
                disabled={!reason.trim()}
                savingPlans={savingPlans}
              />
            ))}
          </tbody>
          <tfoot className="bg-gray-50 border-t border-gray-200">
            <tr>
              <td className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Total inclus</td>
              <td className="text-center bg-red-50/40 border-r-2 border-red-100">
                <span className="text-[12px] font-bold font-mono text-gray-900">
                  {groups.flatMap((g) => g.items).filter((i) => i.is_globally_enabled).length}
                </span>
              </td>
              {plans.map((p) => (
                <td key={p.id} className="text-center">
                  <span className="text-[12px] font-bold font-mono text-gray-900">{featuresByPlan.get(p.id)?.size ?? 0}</span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <Legend />

      {pendingKill && (
        <KillSwitchModal
          flagSlug={pendingKill.item.slug}
          flagName={pendingKill.item.name}
          nextEnabled={pendingKill.nextEnabled}
          onClose={() => setPendingKill(null)}
          onConfirm={handleKillConfirm}
        />
      )}
    </div>
  )
}

function ReasonBar({ reason, setReason }: { reason: string; setReason: (v: string) => void }): JSX.Element {
  return (
    <div className="bg-gold-50 border border-gold-300 rounded-lg p-3 flex items-start gap-3">
      <Info size={16} className="text-gold-700 shrink-0 mt-0.5" />
      <div className="flex-1">
        <label className="block text-[11px] uppercase tracking-wider text-gold-700 font-bold mb-1">
          Motif de la session <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: ajustement offre Q2, ouverture beta, etc."
          className="w-full px-3 py-1.5 text-[12.5px] border border-gold-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white"
        />
        <p className="text-[10.5px] text-gold-700 mt-1">
          Tracé dans l&apos;audit log pour les modifications de cellules plan. Le kill switch global utilise un motif dédié par action.
        </p>
      </div>
    </div>
  )
}

function PlanHeaderCell({ plan, saving }: { plan: AdminPlan; saving: boolean }): JSX.Element {
  return (
    <th className={`text-center text-[11px] uppercase tracking-wider font-bold text-gray-500 px-3 py-3 w-32 ${plan.is_default ? 'bg-gold-50' : ''}`}>
      <div className="flex flex-col items-center gap-0.5">
        <span className={plan.is_default ? 'text-gold-900' : ''}>{plan.name}</span>
        <span className="text-[10px] font-mono text-gray-400 normal-case tracking-normal">
          {plan.monthly_price_eur === 0 ? '0 €' : `${plan.monthly_price_eur.toLocaleString('fr-FR')} €`}
        </span>
        {saving && <span className="text-[9.5px] text-gold-700 normal-case">enregistrement…</span>}
      </div>
    </th>
  )
}

interface CategorySectionProps {
  label: string
  category: FeatureCategory
  items: FeatureCatalogItem[]
  plans: AdminPlan[]
  featuresByPlan: Map<string, Set<string>>
  onPlanToggle: (planId: string, flagId: string) => void
  onKillToggle: (item: FeatureCatalogItem) => void
  disabled: boolean
  savingPlans: Set<string>
}

function CategorySection({ label, items, plans, featuresByPlan, onPlanToggle, onKillToggle, disabled, savingPlans }: CategorySectionProps): JSX.Element {
  return (
    <>
      <tr className="bg-gray-50">
        <td colSpan={plans.length + 2} className="px-5 py-2 text-[10.5px] uppercase tracking-wider text-gray-500 font-bold">
          {label}
        </td>
      </tr>
      {items.map((item) => (
        <tr key={item.id} className={`hover:bg-gray-50/50 ${!item.is_globally_enabled ? 'opacity-60' : ''}`}>
          <td className="px-5 py-3 sticky left-0 bg-white">
            <div className="text-[12.5px] font-semibold text-gray-900 flex items-center gap-1.5">
              {item.name}
              {item.maturity === 'beta' && <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-gold-100 text-gold-700">Beta</span>}
              {item.maturity === 'new' && <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">Nouveau</span>}
            </div>
            <div className="text-[10.5px] text-gray-400 font-mono">{item.slug}</div>
          </td>
          <td className="text-center bg-red-50/40 border-r-2 border-red-100">
            <KillSwitchCell on={item.is_globally_enabled} onClick={() => onKillToggle(item)} />
          </td>
          {plans.map((plan) => {
            const isOn = featuresByPlan.get(plan.id)?.has(item.id) ?? false
            const cellDisabled = disabled || savingPlans.has(plan.id) || !item.is_globally_enabled
            return (
              <td key={plan.id} className={`text-center ${plan.is_default ? 'bg-gold-50/30' : ''}`}>
                <Cell on={isOn} disabled={cellDisabled} maturity={item.maturity} onClick={() => onPlanToggle(plan.id, item.id)} />
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

function Cell({ on, disabled, maturity, onClick }: { on: boolean; disabled: boolean; maturity: 'stable' | 'beta' | 'new'; onClick: () => void }): JSX.Element {
  const cls = on
    ? maturity === 'beta'
      ? 'bg-gold-100 text-gold-700 hover:bg-gold-200'
      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
    : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
  const char = on ? (maturity === 'beta' ? 'β' : '✓') : '—'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-bold transition-colors ${cls} ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      {char}
    </button>
  )
}

function KillSwitchCell({ on, onClick }: { on: boolean; onClick: () => void }): JSX.Element {
  const cls = on
    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
    : 'bg-red-100 text-red-700 hover:bg-red-200'
  return (
    <button
      type="button"
      onClick={onClick}
      title={on ? 'Cliquer pour couper globalement' : 'Cliquer pour réactiver globalement'}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${cls}`}
    >
      {on ? 'ON' : 'OFF'}
    </button>
  )
}

function Legend(): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-500 px-1">
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[9px]">ON</span>
        Active globalement
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold text-[9px]">OFF</span>
        Kill switch actif
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold">✓</span>
        Inclus dans le plan
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold-100 text-gold-700 font-bold">β</span>
        Beta inclus
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-50 text-gray-300 font-bold">—</span>
        Non inclus
      </span>
    </div>
  )
}
