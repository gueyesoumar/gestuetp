import { Link } from 'react-router-dom'
import { Check, ChevronRight, X } from 'lucide-react'
import { useOnboardingTasks } from './useOnboardingTasks'
import { useDismissedTips } from '../../hooks/useDismissedTips'

/**
 * Carte « Prise en main » (onboarding Phase 2). Tâches composées par permissions
 * + portée (voir useOnboardingTasks), auto-masquée quand tout est fait, et
 * refermable (« Masquer » → user_dismissed_tips, clé onboarding.checklist).
 * `tone` : « dark » sur le Hub (variables --hub-fg), « light » sur le portail.
 */
const TIP_KEY = 'onboarding.checklist'

interface Props {
  tone?: 'light' | 'dark'
  className?: string
}

export function OnboardingChecklist({ tone = 'light', className = '' }: Props): JSX.Element | null {
  const { loading, tasks, doneCount, totalCount } = useOnboardingTasks()
  const { isDismissed, dismiss, loading: tipLoading } = useDismissedTips()

  if (loading || tipLoading) return null
  if (totalCount === 0 || doneCount >= totalCount) return null
  if (isDismissed(TIP_KEY)) return null

  const dark = tone === 'dark'
  const pct = Math.round((doneCount / totalCount) * 100)
  const card = dark
    ? 'border-[rgb(var(--hub-fg)/0.12)] bg-[rgb(var(--hub-fg)/0.04)]'
    : 'border-gray-200 bg-white shadow-sm'
  const strong = dark ? 'text-[rgb(var(--hub-fg)/0.92)]' : 'text-gray-900'
  const muted = dark ? 'text-[rgb(var(--hub-fg)/0.5)]' : 'text-gray-400'
  const rowHover = dark ? 'hover:bg-[rgb(var(--hub-fg)/0.05)]' : 'hover:bg-gray-50'

  return (
    <div className={`mx-auto w-full max-w-[620px] rounded-2xl border p-4 ${card} ${className}`}>
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(#D4A843 ${pct}%, ${dark ? 'rgba(255,255,255,0.12)' : '#eef1ec'} 0)` }}
        >
          <span className={`grid h-[34px] w-[34px] place-items-center rounded-full font-mono text-[11px] font-bold ${dark ? 'bg-[#0f2820] text-white' : 'bg-white text-gray-800'}`}>
            {doneCount}/{totalCount}
          </span>
        </div>
        <div className="flex-1">
          <p className={`text-[14px] font-bold ${strong}`}>Prise en main</p>
          <p className={`text-[11.5px] ${muted}`}>Encore {totalCount - doneCount} étape{totalCount - doneCount > 1 ? 's' : ''} pour être opérationnel.</p>
        </div>
        <button type="button" onClick={() => void dismiss(TIP_KEY)} aria-label="Masquer" className={`shrink-0 rounded-md p-1 ${muted} hover:opacity-80`}>
          <X size={15} />
        </button>
      </div>

      <ul className="mt-2 space-y-0.5">
        {tasks.map((t) => (
          <li key={t.key}>
            <Link
              to={t.to}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-[12.5px] transition-colors ${t.done ? '' : rowHover}`}
            >
              <span
                className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border ${
                  t.done
                    ? 'border-[#2f7d5b] bg-[#2f7d5b] text-white'
                    : dark ? 'border-[rgb(var(--hub-fg)/0.25)]' : 'border-gray-300'
                }`}
              >
                {t.done && <Check size={11} strokeWidth={3} />}
              </span>
              <span className={`flex-1 ${t.done ? `${muted} line-through` : strong}`}>{t.label}</span>
              {!t.done && <ChevronRight size={15} className="text-[#D4A843]" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
