import { useAuth } from '../../hooks/useAuth'
import { useBranding } from '../branding/useBranding'
import { useDismissedTips } from '../../hooks/useDismissedTips'

/**
 * Écran de bienvenue plein écran, affiché UNE fois après la première connexion
 * (juste après l'enrôlement MFA). Nominatif + aux couleurs du cabinet en marque
 * blanche, sinon plateforme. « Compris » persiste via user_dismissed_tips
 * (clé onboarding.welcome) — les comptes existants sont exclus par le backfill
 * 00236, donc seuls les nouveaux utilisateurs le voient.
 */
const TIP_KEY = 'onboarding.welcome'
const PLATFORM_PRIMARY = '#0f2820'
const PLATFORM_ACCENT = '#D4A843'

export function OnboardingWelcome(): JSX.Element | null {
  const { profile } = useAuth()
  const { branding, loading: brandingLoading } = useBranding()
  const { isDismissed, dismiss, loading } = useDismissedTips()

  if (loading || brandingLoading || !profile) return null
  if (isDismissed(TIP_KEY)) return null

  const primary = branding?.primary_color ?? PLATFORM_PRIMARY
  const accent = branding?.accent_color ?? PLATFORM_ACCENT
  const brandName = branding?.cabinet_name ?? 'Gëstu ETP'
  const logo = branding?.logo_light_url ?? null
  const isClient = profile.role === 'client'

  const subtitle = isClient
    ? `Votre espace ${brandName} est prêt. Vos missions et demandes de documents apparaîtront ici dès que votre cabinet les partagera.`
    : `Votre espace ${brandName} est prêt. Configurons-le en quelques minutes pour lancer votre première mission.`

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      style={{ background: `radial-gradient(120% 120% at 50% 0%, ${primary}f2, ${PLATFORM_PRIMARY})` }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md text-center">
        {logo ? (
          <img src={logo} alt={brandName} className="mx-auto mb-8 max-h-14 w-auto" />
        ) : (
          <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: accent }}>
            <span className="font-serif text-2xl font-black" style={{ color: primary }}>G</span>
          </div>
        )}

        <div className="mb-3 text-3xl" aria-hidden="true">👋</div>
        <h1 className="text-[26px] font-bold tracking-[-0.4px] text-white">
          Bienvenue, {profile.first_name}
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-[14px] leading-relaxed text-white/65">
          {subtitle}
        </p>

        <button
          type="button"
          onClick={() => void dismiss(TIP_KEY)}
          className="mt-9 rounded-xl px-8 py-3.5 text-[14px] font-bold transition-transform hover:scale-[1.02]"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, color: primary }}
        >
          Commencer →
        </button>
      </div>
    </div>
  )
}
