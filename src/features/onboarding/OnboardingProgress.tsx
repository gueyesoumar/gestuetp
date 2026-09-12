import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react'
import { useOnboardingTasks } from './useOnboardingTasks'
import { useDismissedTips } from '../../hooks/useDismissedTips'

/**
 * Barre « Prise en main » (onboarding — placement P2). Remplace l'ancienne carte
 * centrale : une barre fine et discrète qui vit sous la top-bar sans encombrer le
 * lanceur, et se déplie en panneau détaillé à la demande.
 *
 * Réutilise useOnboardingTasks (tâches composées par profil + complétion DÉRIVÉE
 * des données — jamais un booléen « fait ») et useDismissedTips (clé
 * onboarding.checklist). Auto-masquée quand tout est fait ou refermée.
 * `tone` : « dark » sur le Hub, « light » sur le portail.
 */
const TIP_KEY = 'onboarding.checklist'
const OPEN_KEY = 'gestu.onboarding.panelOpen'

function readStoredOpen(): boolean | null {
  try {
    const v = localStorage.getItem(OPEN_KEY)
    return v === null ? null : v === '1'
  } catch { return null }
}

interface Props {
  tone?: 'light' | 'dark'
  className?: string
}

export function OnboardingProgress({ tone = 'light', className = '' }: Props): JSX.Element | null {
  const { loading, tasks, doneCount, totalCount } = useOnboardingTasks()
  const { isDismissed, dismiss, loading: tipLoading } = useDismissedTips()
  const [override, setOverride] = useState<boolean | null>(readStoredOpen)

  if (loading || tipLoading) return null
  if (totalCount === 0 || doneCount >= totalCount) return null
  if (isDismissed(TIP_KEY)) return null

  // Ouvert par défaut pour un tout nouveau compte (rien de fait), replié ensuite.
  const open = override ?? doneCount === 0
  const dark = tone === 'dark'
  const pct = Math.round((doneCount / totalCount) * 100)
  const remaining = totalCount - doneCount

  const shell = dark
    ? 'border-[rgb(var(--hub-fg)/0.12)] bg-[rgb(var(--hub-fg)/0.04)]'
    : 'border-gray-200 bg-white shadow-sm'
  const strong = dark ? 'text-[rgb(var(--hub-fg)/0.92)]' : 'text-gray-900'
  const muted = dark ? 'text-[rgb(var(--hub-fg)/0.5)]' : 'text-gray-400'
  const track = dark ? 'bg-[rgb(var(--hub-fg)/0.14)]' : 'bg-gray-200'
  const rowHover = dark ? 'hover:bg-[rgb(var(--hub-fg)/0.05)]' : 'hover:bg-gray-50'
  const divide = dark ? 'border-[rgb(var(--hub-fg)/0.1)]' : 'border-gray-100'

  const toggle = (): void => {
    const next = !open
    setOverride(next)
    try { localStorage.setItem(OPEN_KEY, next ? '1' : '0') } catch { /* stockage indisponible */ }
  }

  return (
    <div className={`mx-auto w-full max-w-[960px] rounded-xl border ${shell} ${className}`}>
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <button type="button" onClick={toggle} aria-expanded={open} className="flex flex-1 items-center gap-3 text-left">
          {open
            ? <ChevronDown size={16} className={`shrink-0 ${muted}`} />
            : <ChevronRight size={16} className={`shrink-0 ${muted}`} />}
          <span className={`shrink-0 text-[12.5px] font-bold ${strong}`}>Prise en main</span>
          <span className={`hidden h-1.5 max-w-[220px] flex-1 overflow-hidden rounded-full sm:block ${track}`}>
            <span className="block h-full rounded-full bg-[#D4A843]" style={{ width: `${pct}%` }} />
          </span>
          <span className={`shrink-0 font-mono text-[11px] font-bold ${muted}`}>{doneCount}/{totalCount}</span>
          <span className={`shrink-0 text-[11.5px] ${muted}`}>· encore {remaining} étape{remaining > 1 ? 's' : ''}</span>
        </button>
        <button type="button" onClick={() => void dismiss(TIP_KEY)} aria-label="Masquer la prise en main" className={`shrink-0 rounded-md p-1 ${muted} hover:opacity-80`}>
          <X size={14} />
        </button>
      </div>

      {open && (
        <ul className={`max-h-[46vh] overflow-y-auto border-t px-2 pb-2 pt-1 ${divide}`}>
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
      )}
    </div>
  )
}
