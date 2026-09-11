import { Check } from 'lucide-react'
import { evaluatePasswordCriteria, type PasswordPolicy } from '../../lib/passwordPolicy'

/**
 * Checklist des critères de la politique de mot de passe, réévaluée à chaque
 * frappe : ✓ quand le critère est rempli, puce neutre sinon. Purement UX —
 * l'enforcement fait autorité côté serveur (edge `set-password` + HIBP).
 *
 * `tone` couvre les deux contextes visuels : « dark » (vault / panneau brandé
 * foncé), « light » (cartes et modales claires).
 */
interface PasswordCriteriaProps {
  password: string
  policy: PasswordPolicy
  tone?: 'light' | 'dark'
  className?: string
}

export function PasswordCriteria({ password, policy, tone = 'light', className = '' }: PasswordCriteriaProps): JSX.Element {
  const criteria = evaluatePasswordCriteria(password, policy)
  const dark = tone === 'dark'

  return (
    <ul className={`space-y-1.5 ${className}`} aria-label="Critères du mot de passe">
      {criteria.map((c) => {
        const textColor = c.met
          ? dark ? 'text-[#E2C26B]' : 'text-forest-700'
          : dark ? 'text-white/35' : 'text-gray-400'
        const badgeClass = c.met
          ? dark ? 'border-[#E2C26B] bg-[#E2C26B]/15' : 'border-forest-500 bg-forest-50'
          : dark ? 'border-white/20' : 'border-gray-300'
        return (
          <li key={c.key} className={`flex items-center gap-2 text-[12px] transition-colors ${textColor}`}>
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${badgeClass}`}>
              {c.met && <Check size={11} strokeWidth={3} className={dark ? 'text-[#E2C26B]' : 'text-forest-600'} />}
            </span>
            <span>{c.label}</span>
          </li>
        )
      })}
    </ul>
  )
}
