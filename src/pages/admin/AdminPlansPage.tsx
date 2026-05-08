import { useEffect, useMemo, useState } from 'react'
import { Plus, LayoutGrid, Table2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAdminPlans, type AdminPlan, type PlanInput } from '../../features/admin/plans/useAdminPlans'
import { PlanCard } from '../../features/admin/plans/PlanCard'
import { PlanFormModal } from '../../features/admin/plans/PlanFormModal'
import { PlanDeleteModal } from '../../features/admin/plans/PlanDeleteModal'
import { PlansMatrixView } from '../../features/admin/plans/PlansMatrixView'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useToast } from '../../hooks/useToast'

type ViewMode = 'cards' | 'matrix'

export function AdminPlansPage(): JSX.Element {
  const { plans, featuresByPlan, loading, error, createPlan, updatePlan, deletePlan, setPlanFeatures } = useAdminPlans()
  const [totalFeatures, setTotalFeatures] = useState(0)
  const [editing, setEditing] = useState<AdminPlan | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<AdminPlan | null>(null)
  const [view, setView] = useState<ViewMode>('cards')
  const toast = useToast()

  useEffect(() => {
    const abort = new AbortController()
    void (async () => {
      const { count } = await supabase
        .from('feature_flags')
        .select('id', { count: 'exact', head: true })
        .abortSignal(abort.signal)
      if (!abort.signal.aborted) setTotalFeatures(count ?? 0)
    })()
    return () => abort.abort()
  }, [])

  const stats = useMemo(() => {
    const totalCabinets = plans.reduce((s, p) => s + p.cabinets_count, 0)
    const mrr = plans.reduce((s, p) => s + (p.cabinets_count * p.monthly_price_eur), 0)
    const defaultPlan = plans.find((p) => p.is_default)
    return { totalCabinets, mrr, defaultPlan }
  }, [plans])

  const handleCreate = async (input: PlanInput, reason: string): ReturnType<typeof createPlan> => {
    const res = await createPlan(input, reason)
    if (res.ok) toast.success('Plan créé', { description: input.name })
    return res
  }

  const handleUpdate = async (input: PlanInput, reason: string): ReturnType<typeof updatePlan> => {
    if (!editing) return { ok: false, error: 'Aucun plan en édition' }
    const res = await updatePlan(editing.id, input, reason)
    if (res.ok) toast.success('Plan mis à jour', { description: input.name })
    return res
  }

  const handleDelete = async (planId: string, reason: string): ReturnType<typeof deletePlan> => {
    const res = await deletePlan(planId, reason)
    if (res.ok) toast.success('Plan supprimé')
    return res
  }

  const handleDuplicate = (source: AdminPlan): void => {
    setCreating(true)
    setEditing({
      ...source,
      id: '',
      slug: '',
      name: `${source.name} (copie)`,
      is_default: false,
      cabinets_count: 0,
      features_count: 0,
    })
  }

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorAlert message={error} /></div>

  return (
    <div className="px-7 py-6">
      <div className="text-[11.5px] text-gray-500 mb-1">
        <b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Plans
      </div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Plans tarifaires</h1>
          <p className="text-[12.5px] text-gray-500 mt-0.5">
            Définit les offres commerciales et les fonctionnalités incluses dans chacune.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setCreating(true); setEditing(null) }}
          className="px-3.5 py-2 bg-forest-700 hover:bg-forest-900 text-white rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5"
        >
          <Plus size={13} strokeWidth={2.8} />
          Créer un plan
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Plans actifs" value={String(plans.length)} accent="border-forest-700" />
        <KpiCard label="Plan par défaut" value={stats.defaultPlan?.name ?? '—'} accent="border-gold-500" textClass="text-gold-900" small />
        <KpiCard label="Cabinets total" value={String(stats.totalCabinets)} accent="border-gray-200" hint="répartis sur les plans" />
        <KpiCard label="MRR estimé" value={`${stats.mrr.toLocaleString('fr-FR')} €`} accent="border-gray-200" textClass="text-emerald-700" mono hint="paiement non intégré" />
      </div>

      <div className="flex gap-1 mb-4">
        <ViewBtn active={view === 'cards'} onClick={() => setView('cards')} icon={<LayoutGrid size={13} />}>Plans (cartes)</ViewBtn>
        <ViewBtn active={view === 'matrix'} onClick={() => setView('matrix')} icon={<Table2 size={13} />}>Matrice fonctionnalités</ViewBtn>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
          Aucun plan créé.
        </div>
      ) : view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              totalFeatures={totalFeatures}
              onEdit={() => { setEditing(plan); setCreating(false) }}
              onDuplicate={() => handleDuplicate(plan)}
              onDelete={() => setDeleting(plan)}
            />
          ))}
        </div>
      ) : (
        <PlansMatrixView plans={plans} featuresByPlan={featuresByPlan} onSetFeatures={setPlanFeatures} />
      )}

      {(creating || (editing && !creating)) && (
        <PlanFormModal
          plan={creating ? null : editing}
          initialFeatureIds={
            creating
              ? new Set()
              : (editing && featuresByPlan.get(editing.id)) ?? new Set()
          }
          cabinetsImpact={editing && !creating ? editing.cabinets_count : undefined}
          onClose={() => { setEditing(null); setCreating(false) }}
          onSubmit={creating ? handleCreate : handleUpdate}
          onSetFeatures={setPlanFeatures}
        />
      )}

      {deleting && (
        <PlanDeleteModal
          plan={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}

interface KpiCardProps {
  label: string
  value: string
  accent: string
  textClass?: string
  hint?: string
  mono?: boolean
  small?: boolean
}

function ViewBtn({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: JSX.Element; children: React.ReactNode }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border inline-flex items-center gap-1.5 transition-colors ${
        active ? 'bg-forest-700 text-white border-forest-700' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

function KpiCard({ label, value, accent, textClass, hint, mono, small }: KpiCardProps): JSX.Element {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 p-4 ${accent}`}>
      <p className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold mb-1">{label}</p>
      <p className={`${small ? 'text-[16px] mt-2' : 'text-[22px]'} font-extrabold text-gray-900 ${textClass ?? ''} ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
    </div>
  )
}
