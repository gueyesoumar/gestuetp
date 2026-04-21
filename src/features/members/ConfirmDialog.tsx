import { Modal } from '../../components/ui/Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2.5 text-[13px] font-medium text-white transition-colors ${
            danger
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-forest-700 hover:bg-forest-900'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
