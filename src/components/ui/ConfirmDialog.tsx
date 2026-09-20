import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  /** Si défini, l'utilisateur doit saisir exactement ce mot pour activer la confirmation. */
  confirmWord?: string
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Boîte de confirmation standard de la plateforme.
 *
 * Motif unique réutilisé pour toute action lourde ou irréversible (clôture,
 * lancement de revue, envoi client, renvoi). S'appuie sur le primitif Modal.
 * La confirmation reste côté client : elle ne remplace jamais les contrôles
 * d'autorisation serveur (edges/RPC).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  confirmWord,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState('')

  // Réinitialise la saisie à chaque ouverture.
  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  const wordOk = !confirmWord || typed.trim() === confirmWord
  const isDanger = variant === 'danger'

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex gap-3">
          {isDanger && <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />}
          <div className="text-[13px] text-gray-600 leading-relaxed">{message}</div>
        </div>

        {confirmWord && (
          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-1.5">
              Saisissez <span className="font-mono font-semibold text-gray-700">{confirmWord}</span> pour confirmer
            </label>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !wordOk}
            className={`px-5 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50 transition-colors ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-forest-700 hover:bg-forest-900'
            }`}
          >
            {busy ? 'En cours...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
