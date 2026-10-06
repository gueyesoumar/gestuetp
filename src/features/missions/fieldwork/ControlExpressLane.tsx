import { Check, Ban } from 'lucide-react'

interface ControlExpressLaneProps {
  /** Désactivé dès qu'un constat existe (la voie express vaut « rien à signaler »). */
  disabled: boolean
  onExpress: (level: 'c' | 'na') => void
}

/**
 * Voie express de l'écran unique : soumission directe d'un contrôle sans constat,
 * soit « Conforme — aucun écart », soit « Non applicable ».
 */
export function ControlExpressLane({ disabled, onExpress }: ControlExpressLaneProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap bg-[#FAFAF8] border border-gray-200 rounded-xl px-3.5 py-2.5">
      <span className="text-[12px] font-medium text-gray-500 mr-1">Rien &agrave; signaler&nbsp;?</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onExpress('c')}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-green-700 border border-forest-300 rounded-lg px-3 py-1.5 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Check size={13} /> Conforme &mdash; aucun &eacute;cart
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onExpress('na')}
        className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Ban size={13} /> Non applicable
      </button>
    </div>
  )
}
