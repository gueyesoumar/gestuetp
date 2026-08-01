import { useState } from 'react'
import { X } from 'lucide-react'
import type { AdminPlan, PlanInput, PlanTier } from './useAdminPlans'
import { PlanFeaturesPicker } from './PlanFeaturesPicker'
import { PlanGeneralTab } from './PlanGeneralTab'
import { PlanLimitsTab } from './PlanLimitsTab'

interface PlanFormModalProps {
  plan: AdminPlan | null
  initialFeatureIds: Set<string>
  cabinetsImpact?: number
  onClose: () => void
  onSubmit: (input: PlanInput, reason: string) => Promise<{ ok: boolean; error?: string; planId?: string }>
  onSetFeatures: (planId: string, flagIds: string[], reason: string) => Promise<{ ok: boolean; error?: string }>
}

type TabKey = 'general' | 'features' | 'limits'

export function PlanFormModal(props: PlanFormModalProps): JSX.Element {
  const { plan, initialFeatureIds, cabinetsImpact, onClose, onSubmit, onSetFeatures } = props
  const isEdit = plan !== null

  const [tab, setTab] = useState<TabKey>('general')
  const [name, setName] = useState(plan?.name ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [tier, setTier] = useState<PlanTier>(plan?.tier ?? 'standard')
  const [price, setPrice] = useState(String(plan?.monthly_price_eur ?? 0))
  const [maxUsers, setMaxUsers] = useState(plan?.max_users != null ? String(plan.max_users) : '')
  const [maxMissions, setMaxMissions] = useState(plan?.max_missions != null ? String(plan.max_missions) : '')
  const [isDefault, setIsDefault] = useState(plan?.is_default ?? false)
  const [featureIds, setFeatureIds] = useState<Set<string>>(initialFeatureIds)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const featuresChanged = !setsEqual(featureIds, initialFeatureIds)
  const featuresCount = featureIds.size

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim() || !reason.trim()) return
    const numPrice = Number(price)
    if (Number.isNaN(numPrice) || numPrice < 0) {
      setErrorMsg('Prix invalide')
      return
    }
    setSubmitting(true)
    setErrorMsg(null)

    const input: PlanInput = {
      name: name.trim(),
      description: description.trim() || null,
      monthly_price_eur: numPrice,
      tier,
      max_users: maxUsers === '' ? null : Number(maxUsers),
      max_missions: maxMissions === '' ? null : Number(maxMissions),
      is_default: isDefault,
    }

    const res = await onSubmit(input, reason)
    if (!res.ok) {
      setSubmitting(false)
      setErrorMsg(res.error ?? 'Action impossible')
      return
    }

    const targetPlanId = isEdit ? plan.id : res.planId
    if (targetPlanId && (featuresChanged || (!isEdit && featureIds.size > 0))) {
      const setRes = await onSetFeatures(targetPlanId, [...featureIds], reason)
      if (!setRes.ok) {
        setSubmitting(false)
        setErrorMsg(`Plan enregistré mais features partiellement appliquées: ${setRes.error ?? 'erreur'}`)
        return
      }
    }

    setSubmitting(false)
    onClose()
  }

  const submitDisabled = submitting || !name.trim() || !reason.trim()

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">
              {isEdit ? 'Modifier le plan' : 'Créer un plan'}
            </h3>
            <p className="text-[11.5px] text-gray-500 mt-0.5">
              {isEdit
                ? 'Les modifications s’appliquent immédiatement à tous les cabinets sur ce plan.'
                : 'Le slug technique est auto-généré à partir du nom et non modifiable après création.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
        </div>

        <div className="flex border-b border-gray-200 px-6 gap-1">
          <TabButton active={tab === 'general'} onClick={() => setTab('general')}>Général</TabButton>
          <TabButton active={tab === 'features'} onClick={() => setTab('features')}>
            Fonctionnalités <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">{featuresCount}</span>
          </TabButton>
          <TabButton active={tab === 'limits'} onClick={() => setTab('limits')}>Limites</TabButton>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          {tab === 'general' && (
            <PlanGeneralTab
              isEdit={isEdit}
              slug={plan?.slug ?? ''}
              name={name} setName={setName}
              description={description} setDescription={setDescription}
              tier={tier} setTier={setTier}
              price={price} setPrice={setPrice}
              isDefault={isDefault} setIsDefault={setIsDefault}
              cabinetsImpact={isEdit ? cabinetsImpact : undefined}
              disabled={submitting}
            />
          )}
          {tab === 'features' && (
            <PlanFeaturesPicker selected={featureIds} onChange={setFeatureIds} disabled={submitting} />
          )}
          {tab === 'limits' && (
            <PlanLimitsTab
              maxUsers={maxUsers} setMaxUsers={setMaxUsers}
              maxMissions={maxMissions} setMaxMissions={setMaxMissions}
              disabled={submitting}
            />
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 space-y-2.5">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
              Motif <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="Pourquoi cette modification ? (tracé dans l'audit log)"
              className="w-full px-3 py-2 text-[12.5px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
              disabled={submitting}
            />
          </div>
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-[11.5px] text-red-700">{errorMsg}</div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
              Annuler
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitDisabled}
              className="px-3.5 py-2 text-[12.5px] font-semibold bg-forest-700 hover:bg-forest-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'En cours…' : isEdit ? 'Enregistrer' : 'Créer le plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2.5 text-[12px] border-b-2 -mb-px transition-colors ${active ? 'border-gold-500 text-forest-900 font-bold' : 'border-transparent text-gray-500 hover:text-gray-700 font-medium'}`}
    >
      {children}
    </button>
  )
}

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}
