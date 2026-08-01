import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Modal } from '../../../../components/ui/Modal'

interface ConformityJustificationModalProps {
  open: boolean
  incoherenceMessage: string
  saving: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}

const MIN_REASON_LENGTH = 20

export function ConformityJustificationModal({
  open, incoherenceMessage, saving, onConfirm, onCancel,
}: ConformityJustificationModalProps): JSX.Element {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const trimmed = reason.trim()
  const reasonValid = trimmed.length >= MIN_REASON_LENGTH
  const canSubmit = reasonValid && confirmed && !saving

  const handleConfirm = (): void => {
    if (!canSubmit) return
    onConfirm(trimmed)
  }

  return (
    <Modal open={open} onClose={onCancel} title="Justification requise">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-amber-900 mb-1">&Eacute;cart d&eacute;tect&eacute;</p>
            <p className="text-[12px] text-amber-800 leading-relaxed">{incoherenceMessage}</p>
          </div>
        </div>

        <div>
          <label htmlFor="conformity-justification" className="block text-[13px] font-medium text-gray-700 mb-1.5">
            Justification (visible par le chef de mission et l&apos;associ&eacute;)
          </label>
          <textarea
            id="conformity-justification"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Expliquez pourquoi ce niveau de conformit&eacute; est appropri&eacute; malgr&eacute; les findings..."
            rows={5}
            disabled={saving}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] text-gray-900 outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-y disabled:bg-gray-50"
          />
          <div className="mt-1 flex items-center justify-between">
            <p className={`text-[10px] ${reasonValid ? 'text-green-600' : 'text-gray-400'}`}>
              {reasonValid ? '✓ Justification suffisante' : `Minimum ${MIN_REASON_LENGTH} caractères (${trimmed.length}/${MIN_REASON_LENGTH})`}
            </p>
          </div>
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            disabled={saving}
            className="mt-0.5 rounded border-gray-300 text-forest-600 focus:ring-forest-500"
          />
          <span className="text-[12px] text-gray-700 leading-relaxed">
            Je confirme assumer cet &eacute;cart entre le niveau de conformit&eacute; et les findings, et accepte qu&apos;il soit visible
            dans la revue interne et conserv&eacute; dans l&apos;audit trail.
          </span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-3 py-2 text-[12px] font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <X size={12} /> Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-3 py-2 text-[12px] font-semibold text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
          >
            {saving ? 'Soumission...' : 'Confirmer et soumettre'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
