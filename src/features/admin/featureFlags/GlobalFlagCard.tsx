import { Sparkles, BarChart3, Palette, ShieldCheck, MessageCircle, Layers } from 'lucide-react'
import type { FeatureFlag, FeatureCategory, FeatureMaturity } from '../useFeatureFlags'

interface GlobalFlagCardProps {
  flag: FeatureFlag
  onToggle: () => void
}

const CATEGORY_VISUAL: Record<FeatureCategory, { bg: string; text: string; icon: JSX.Element }> = {
  ai:        { bg: 'bg-purple-50', text: 'text-purple-700', icon: <Sparkles size={16} /> },
  reporting: { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: <BarChart3 size={16} /> },
  branding:  { bg: 'bg-pink-50',   text: 'text-pink-700',   icon: <Palette size={16} /> },
  security:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: <ShieldCheck size={16} /> },
  collab:    { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: <MessageCircle size={16} /> },
  general:   { bg: 'bg-gray-100',  text: 'text-gray-600',   icon: <Layers size={16} /> },
}

export function GlobalFlagCard({ flag, onToggle }: GlobalFlagCardProps): JSX.Element {
  const visual = CATEGORY_VISUAL[flag.category] ?? CATEGORY_VISUAL.general
  const lastUpdate = new Date(flag.updated_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow h-full flex flex-col">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${visual.bg} ${visual.text}`}>
          {visual.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h4 className="text-[13.5px] font-bold text-gray-900">{flag.name}</h4>
            <MaturityBadge maturity={flag.maturity} />
          </div>
          {flag.description && (
            <p className="text-[11.5px] text-gray-500 leading-snug mb-1.5">{flag.description}</p>
          )}
          <p className="text-[10.5px] font-mono text-gray-400">{flag.slug}</p>
        </div>
        <Toggle enabled={flag.is_globally_enabled} onClick={onToggle} />
      </div>

      <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[10.5px] text-gray-400">Mis à jour le {lastUpdate}</span>
        <span className={`text-[10.5px] font-bold uppercase tracking-wider ${flag.is_globally_enabled ? 'text-emerald-700' : 'text-gray-400'}`}>
          {flag.is_globally_enabled ? 'Active globalement' : 'Désactivée globalement'}
        </span>
      </div>
    </div>
  )
}

function MaturityBadge({ maturity }: { maturity: FeatureMaturity }): JSX.Element | null {
  if (maturity === 'stable') return null
  if (maturity === 'beta') {
    return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-gold-100 text-gold-700">Beta</span>
  }
  return <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">Nouveau</span>
}

function Toggle({ enabled, onClick }: { enabled: boolean; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={enabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-1 cursor-pointer ${enabled ? 'bg-forest-700' : 'bg-gray-300'}`}
    >
      <span className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow transition-all ${enabled ? 'left-[22px]' : 'left-[2px]'}`} />
    </button>
  )
}
