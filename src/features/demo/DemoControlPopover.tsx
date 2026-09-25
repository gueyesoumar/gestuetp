import { GraduationCap, RefreshCw, ArrowRight, Trash2 } from 'lucide-react'

interface Props {
  lensOn: boolean
  busy: boolean
  onToggleLens: () => void
  onRegenerate: () => void
  onConfigure: () => void
  onCleanup: () => void
}

/**
 * Centre de contrôle de la démo (popover). Regroupe la bascule LENTILLE (démo
 * visible/masquée dans le score) et les actions — chacune confirmée côté parent.
 * Présentation only : l'état et les confirmations vivent dans DemoModeBanner.
 */
export function DemoControlPopover({ lensOn, busy, onToggleLens, onRegenerate, onConfigure, onCleanup }: Props): JSX.Element {
  return (
    <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
      <div className="flex items-center gap-2.5 bg-gradient-to-br from-forest-900 to-forest-700 px-4 py-3 text-white">
        <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 text-forest-900">
          <GraduationCap size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold leading-tight">Espace de démonstration</p>
          <p className="text-[11px] leading-tight text-forest-100">Données jetables, isolées de vos indicateurs.</p>
        </div>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={onToggleLens}
          aria-pressed={lensOn}
          className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-left hover:border-forest-300"
        >
          <span className={`relative h-[22px] w-[38px] flex-shrink-0 rounded-full transition-colors ${lensOn ? 'bg-forest-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${lensOn ? 'left-[18px]' : 'left-[2px]'}`} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-semibold text-gray-800">Inclure la démo dans mes indicateurs</span>
            <span className="block text-[11px] text-gray-400">Pour voir votre score « prendre vie ».</span>
          </span>
        </button>

        <div className="mt-2 flex flex-col gap-1.5 border-t border-gray-100 pt-2.5">
          <button type="button" onClick={onRegenerate} disabled={busy} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-gray-700 hover:bg-forest-50 disabled:opacity-50">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-forest-50 text-forest-700"><RefreshCw size={14} className={busy ? 'animate-spin' : ''} /></span>
            Régénérer les données
          </button>
          <button type="button" onClick={onConfigure} disabled={busy} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-gray-700 hover:bg-forest-50 disabled:opacity-50">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-forest-50 text-forest-700"><ArrowRight size={14} /></span>
            Configurer mon vrai cabinet
          </button>
          <button type="button" onClick={onCleanup} disabled={busy} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-red-50 text-red-600"><Trash2 size={14} /></span>
            Supprimer l&apos;espace de démo
          </button>
        </div>
      </div>
    </div>
  )
}
