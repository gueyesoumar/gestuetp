import { useState } from 'react'
import { X } from 'lucide-react'
import type { CabinetFlag } from '../useCabinetFeatureFlags'

export type FlagAction = 'lock' | 'unlock' | 'reset'

interface FlagActionModalProps {
  flag: CabinetFlag
  action: FlagAction
  onClose: () => void
  onConfirm: (reason: string) => Promise<boolean>
}

const ACTION_LABELS: Record<FlagAction, { title: string; description: string; submit: string; danger: boolean }> = {
  lock: {
    title: 'Désactiver cette fonctionnalité pour ce cabinet ?',
    description: 'Crée un override OFF — la fonctionnalité reste activée pour les autres cabinets sur le même plan.',
    submit: 'Désactiver pour ce cabinet',
    danger: true,
  },
  unlock: {
    title: 'Débloquer cette fonctionnalité pour ce cabinet ?',
    description: 'Crée un override ON — la fonctionnalité sera disponible même si le plan ne l’inclut pas.',
    submit: 'Débloquer',
    danger: false,
  },
  reset: {
    title: 'Réinitialiser (hériter du plan) ?',
    description: 'Supprime l’override personnalisé. La fonctionnalité reviendra à l’état défini par le plan du cabinet.',
    submit: 'Réinitialiser',
    danger: false,
  },
}

export function FlagActionModal({ flag, action, onClose, onConfirm }: FlagActionModalProps): JSX.Element {
  const cfg = ACTION_LABELS[action]
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleConfirm = async (): Promise<void> => {
    if (!reason.trim()) return
    setSubmitting(true)
    setErrorMsg(null)
    const ok = await onConfirm(reason)
    setSubmitting(false)
    if (ok) onClose()
    else setErrorMsg('Action impossible')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[14.5px] font-bold text-gray-900">{cfg.title}</h3>
            <p className="text-[11.5px] text-gray-600 mt-1 leading-relaxed">{cfg.description}</p>
            <p className="text-[10.5px] text-gray-400 font-mono mt-1.5">{flag.slug}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 shrink-0"><X size={16} /></button>
        </div>

        <div className="px-5 py-4">
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
            Motif <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Pourquoi cette action ? (tracé dans l'audit log)"
            rows={3}
            className="w-full px-3 py-2 text-[12.5px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
            disabled={submitting}
          />
          {errorMsg && <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 text-[11.5px] text-red-700">{errorMsg}</div>}
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting}
            className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Annuler
          </button>
          <button type="button" onClick={handleConfirm} disabled={submitting || !reason.trim()}
            className={`px-3.5 py-2 text-[12.5px] font-semibold text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              cfg.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-forest-700 hover:bg-forest-900'
            }`}>
            {submitting ? 'En cours…' : cfg.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
