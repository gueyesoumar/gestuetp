import type { ReactNode, FormEvent } from 'react'

interface SplitFormProps {
  children: ReactNode
  onSubmit: (e: FormEvent) => void
  onSave?: () => void
  submitLabel?: string
  submitting?: boolean
  onCancel?: () => void
}

export function SplitForm({ children, onSubmit, onSave, submitLabel = 'Enregistrer', submitting = false, onCancel }: SplitFormProps) {
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {children}
      <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-page-bg px-6 py-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-5 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-forest-50 hover:border-forest-300 transition-colors"
          >
            Annuler
          </button>
        )}
        <button
          type="button"
          disabled={submitting}
          onClick={onSave}
          className="rounded-lg bg-forest-700 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-forest-900 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Enregistrement...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
