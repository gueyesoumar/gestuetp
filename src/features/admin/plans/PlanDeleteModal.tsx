import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { AdminPlan } from './useAdminPlans'

interface PlanDeleteModalProps {
  plan: AdminPlan
  onClose: () => void
  onConfirm: (planId: string, reason: string) => Promise<{ ok: boolean; error?: string }>
}

export function PlanDeleteModal({ plan, onClose, onConfirm }: PlanDeleteModalProps): JSX.Element {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleConfirm = async (): Promise<void> => {
    if (!reason.trim()) return
    setSubmitting(true)
    setErrorMsg(null)
    const res = await onConfirm(plan.id, reason)
    setSubmitting(false)
    if (res.ok) onClose()
    else setErrorMsg(res.error ?? 'Suppression impossible')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <Trash2 size={16} />
          </div>
          <div>
            <h3 className="text-[14.5px] font-bold text-gray-900">
              Supprimer le plan &laquo;&nbsp;{plan.name}&nbsp;&raquo; ?
            </h3>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Cette action est irréversible. Aucun cabinet n&apos;utilise actuellement ce plan.
            </p>
          </div>
        </div>

        <div className="px-5 py-4">
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
            Motif <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Pourquoi supprimer ce plan ? (tracé dans l'audit log)"
            rows={3}
            className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300"
            disabled={submitting}
          />
          {errorMsg && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-2.5 text-[12px] text-red-700">{errorMsg}</div>
          )}
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !reason.trim()}
            className="px-3.5 py-2 text-[12.5px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      </div>
    </div>
  )
}
