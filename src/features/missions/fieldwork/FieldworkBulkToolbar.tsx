import { X, Loader2, CheckCircle } from 'lucide-react'

interface FieldworkBulkToolbarProps {
  selectedCount: number
  saving: boolean
  onClear: () => void
  onSubmitConforme: () => void
}

/**
 * Barre d'actions de masse de la phase Travaux (RFC UX Lot 3).
 * Calquée sur WorkProgramBulkToolbar (Planification) pour la cohérence.
 */
export function FieldworkBulkToolbar({ selectedCount, saving, onClear, onSubmitConforme }: FieldworkBulkToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-forest-700 text-white rounded-xl mb-4">
      <button
        type="button"
        onClick={onClear}
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-forest-900 transition-colors"
        aria-label="D&eacute;s&eacute;lectionner tout"
      >
        <X size={14} />
      </button>
      <span className="text-xs font-semibold">
        {selectedCount} contr&ocirc;le{selectedCount > 1 ? 's' : ''} s&eacute;lectionn&eacute;{selectedCount > 1 ? 's' : ''}
      </span>
      {saving && <Loader2 size={13} className="animate-spin text-gold-300 ml-1" />}
      <button
        type="button"
        disabled={saving}
        onClick={onSubmitConforme}
        className="ml-auto text-[12px] font-semibold bg-gold-500 text-forest-900 rounded-lg px-3.5 py-1.5 inline-flex items-center gap-1.5 hover:bg-gold-400 disabled:opacity-50 transition-colors"
      >
        <CheckCircle size={13} /> Marquer conforme &amp; soumettre
      </button>
    </div>
  )
}
