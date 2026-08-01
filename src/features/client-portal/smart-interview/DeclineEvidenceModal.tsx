import { useState } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { EvidenceDeclineReason } from '../../../types/database.types'

interface DeclineEvidenceModalProps {
  documentName: string
  evidenceRequestIds: string[]
  submitting: boolean
  onClose: () => void
  onConfirm: (reason: EvidenceDeclineReason, justification: string) => Promise<void>
  error: string | null
}

interface ReasonOption {
  value: EvidenceDeclineReason
  title: string
  description: string
}

const REASONS: ReasonOption[] = [
  {
    value: 'inexistant',
    title: 'Le document n\'existe pas dans notre organisation',
    description: 'Le processus n\'est pas formalisé. Sera traité comme une potentielle non-conformité par l\'auditeur.',
  },
  {
    value: 'non_applicable',
    title: 'Le contrôle ne s\'applique pas à notre contexte',
    description: 'Justifiez ci-dessous. L\'auditeur validera ou demandera des éléments complémentaires.',
  },
  {
    value: 'confidentialite',
    title: 'Le document existe mais est soumis à confidentialité',
    description: 'L\'auditeur proposera une preuve alternative (entretien, walk-through, attestation).',
  },
]

export function DeclineEvidenceModal({
  documentName, evidenceRequestIds, submitting, onClose, onConfirm, error,
}: DeclineEvidenceModalProps): JSX.Element {
  const [reason, setReason] = useState<EvidenceDeclineReason | null>(null)
  const [justification, setJustification] = useState('')

  const justificationRequired = reason === 'non_applicable' || reason === 'confidentialite'
  const canSubmit = reason !== null
    && (!justificationRequired || justification.trim().length > 0)
    && !submitting
    && evidenceRequestIds.length > 0

  const handleSubmit = async (): Promise<void> => {
    if (!reason) return
    await onConfirm(reason, justification.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-200">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <AlertCircle size={16} />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-bold text-gray-900">D&eacute;clarer le document non disponible</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">{documentName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && <ErrorAlert message={error} />}

          <p className="text-[13px] text-gray-700 font-medium">Pourquoi ne pouvez-vous pas fournir ce document&nbsp;?</p>

          <div className="space-y-2">
            {REASONS.map((r) => {
              const selected = reason === r.value
              return (
                <label key={r.value}
                  className={`flex items-start gap-2.5 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selected ? 'border-forest-700 bg-forest-50' : 'border-gray-200 hover:border-forest-300 hover:bg-forest-50/40'
                  }`}>
                  <input
                    type="radio"
                    name="decline-reason"
                    checked={selected}
                    onChange={() => setReason(r.value)}
                    className="mt-0.5 accent-forest-700"
                  />
                  <div className="flex-1">
                    <div className={`text-[13px] font-semibold ${selected ? 'text-gray-900' : 'text-gray-700'}`}>{r.title}</div>
                    <div className="text-[11.5px] text-gray-500 mt-1 leading-relaxed">{r.description}</div>
                  </div>
                </label>
              )
            })}
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-700 mb-1">
              Pr&eacute;cisions {justificationRequired
                ? <span className="text-red-600 normal-case font-normal">(obligatoire pour ce motif)</span>
                : <span className="text-gray-400 normal-case font-normal">(recommand&eacute;)</span>
              }
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              placeholder="D&eacute;taillez le contexte, les contraintes ou tout &eacute;l&eacute;ment utile &agrave; l'auditeur&hellip;"
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12.5px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-y"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} disabled={submitting}
            className="px-4 py-2 text-[12px] font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="px-4 py-2 text-[12px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
            {submitting ? 'Envoi&hellip;' : 'Confirmer la déclaration'}
          </button>
        </div>
      </div>
    </div>
  )
}
