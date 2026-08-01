import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface KillSwitchModalProps {
  flagSlug: string
  flagName: string
  nextEnabled: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<{ ok: boolean; error?: string }>
}

export function KillSwitchModal({ flagSlug, flagName, nextEnabled, onClose, onConfirm }: KillSwitchModalProps): JSX.Element {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleConfirm = async (): Promise<void> => {
    if (!reason.trim()) return
    setSubmitting(true)
    setErrorMsg(null)
    const res = await onConfirm(reason)
    setSubmitting(false)
    if (res.ok) onClose()
    else setErrorMsg(res.error ?? 'Action impossible')
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${nextEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            <AlertTriangle size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14.5px] font-bold text-gray-900">
              {nextEnabled ? 'Activer globalement' : 'Désactiver globalement (kill switch)'}
            </h3>
            <p className="text-[11.5px] text-gray-600 mt-1 leading-relaxed">
              {nextEnabled
                ? 'La fonctionnalité redevient disponible pour tous les cabinets dont le plan l’inclut ou qui ont un override ON.'
                : 'Coupe la fonctionnalité pour TOUS les cabinets, quels que soient leurs plans ou overrides. À utiliser pour gérer un incident.'}
            </p>
            <div className="mt-2 text-[11.5px] text-gray-700">
              <b>{flagName}</b> <span className="text-[10.5px] text-gray-400 font-mono">· {flagSlug}</span>
            </div>
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
            placeholder="Pourquoi ce changement global ? (tracé dans l'audit log)"
            rows={3}
            className="w-full px-3 py-2 text-[12.5px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-300"
            disabled={submitting}
          />
          {errorMsg && <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2 text-[11.5px] text-red-700">{errorMsg}</div>}
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Annuler
          </button>
          <button type="button" onClick={handleConfirm} disabled={submitting || !reason.trim()}
            className={`px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white disabled:opacity-50 ${nextEnabled ? 'bg-forest-700 hover:bg-forest-900' : 'bg-red-600 hover:bg-red-700'}`}>
            {submitting ? 'En cours…' : nextEnabled ? 'Activer' : 'Désactiver globalement'}
          </button>
        </div>
      </div>
    </div>
  )
}
