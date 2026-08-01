import { CheckCircle2, XCircle, Lock, Unlock, RotateCcw, MinusCircle } from 'lucide-react'
import type { CabinetFlag } from '../useCabinetFeatureFlags'
import type { FlagAction } from './FlagActionModal'

interface FlagCardProps {
  flag: CabinetFlag
  onAction: (action: FlagAction) => void
}

function formatRelative(iso: string | null): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} jours`
  return `il y a ${Math.floor(days / 30)} mois`
}

function MaturityBadge({ maturity }: { maturity: 'stable' | 'beta' | 'new' }): JSX.Element | null {
  if (maturity === 'stable') return null
  if (maturity === 'beta') return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-gold-100 text-gold-700">Beta</span>
  return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">Nouveau</span>
}

export function FlagCard({ flag, onAction }: FlagCardProps): JSX.Element {
  const isOverrideOn = flag.state === 'override_on'
  const isOverrideOff = flag.state === 'override_off'
  const borderClass =
    isOverrideOn ? 'border-l-4 border-l-emerald-400' :
    isOverrideOff ? 'border-l-4 border-l-red-400' : ''

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${borderClass} hover:shadow-sm transition-shadow h-full flex flex-col`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h4 className="text-[13.5px] font-bold text-gray-900">{flag.name}</h4>
            <MaturityBadge maturity={flag.maturity} />
          </div>
          {flag.description && <p className="text-[11.5px] text-gray-500 mb-1.5 leading-snug">{flag.description}</p>}
          <p className="text-[10.5px] font-mono text-gray-400">{flag.slug}</p>
        </div>
        <StatePill state={flag.state} />
      </div>

      {(isOverrideOn || isOverrideOff) && flag.override_reason && (
        <div className={`mt-3 rounded-lg p-2.5 ${isOverrideOn ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[10px] uppercase tracking-wider font-bold ${isOverrideOn ? 'text-emerald-700' : 'text-red-700'}`}>
              Override actif — {isOverrideOn ? 'Forcé ON' : 'Forcé OFF'}
            </span>
            <span className="text-[10px] text-gray-500">{formatRelative(flag.override_updated_at)}</span>
          </div>
          <p className={`text-[11.5px] italic ${isOverrideOn ? 'text-emerald-800' : 'text-red-800'}`}>
            &laquo;&nbsp;{flag.override_reason}&nbsp;&raquo;
          </p>
        </div>
      )}

      <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
        <span className="text-[10.5px] text-gray-400">
          {flag.in_plan ? 'Inclus dans le plan' : 'Hors plan'}
          {!flag.is_globally_enabled && ' · kill switch global OFF'}
        </span>
        <ActionButton state={flag.state} onAction={onAction} />
      </div>
    </div>
  )
}

function StatePill({ state }: { state: CabinetFlag['state'] }): JSX.Element {
  const variants: Record<CabinetFlag['state'], { bg: string; text: string; icon: JSX.Element; label: string }> = {
    plan_included: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <CheckCircle2 size={11} />, label: 'Active · via plan' },
    override_on: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <Unlock size={11} />, label: 'Active · personnalisée' },
    override_off: { bg: 'bg-red-50', text: 'text-red-700', icon: <Lock size={11} />, label: 'Désactivée · override' },
    available: { bg: 'bg-gray-100', text: 'text-gray-500', icon: <MinusCircle size={11} />, label: 'Hors plan' },
    unavailable: { bg: 'bg-gray-100', text: 'text-gray-400', icon: <XCircle size={11} />, label: 'Indisponible' },
  }
  const v = variants[state]
  return (
    <span className={`px-2 py-1 rounded-full text-[10.5px] font-bold inline-flex items-center gap-1 whitespace-nowrap ${v.bg} ${v.text}`}>
      {v.icon} {v.label}
    </span>
  )
}

function ActionButton({ state, onAction }: { state: CabinetFlag['state']; onAction: (a: FlagAction) => void }): JSX.Element | null {
  const cls = 'text-[11px] font-semibold inline-flex items-center gap-1'
  if (state === 'plan_included') {
    return <button type="button" onClick={() => onAction('lock')} className={`${cls} text-red-600 hover:text-red-700`}><Lock size={11} /> Désactiver pour ce cabinet</button>
  }
  if (state === 'override_on' || state === 'override_off') {
    return <button type="button" onClick={() => onAction('reset')} className={`${cls} text-forest-700 hover:text-forest-900`}><RotateCcw size={11} /> Réinitialiser (hériter du plan)</button>
  }
  if (state === 'available') {
    return <button type="button" onClick={() => onAction('unlock')} className={`${cls} text-forest-700 hover:text-forest-900`}><Unlock size={11} /> Débloquer pour ce cabinet</button>
  }
  return null
}
