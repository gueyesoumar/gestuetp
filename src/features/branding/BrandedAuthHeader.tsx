import { Logo } from './Logo'
import { useBranding } from './useBranding'

/**
 * En-tête utilisé sur login + hub quand on est sur un domaine cabinet
 * (audit.auditco.sn, etc.). Affiche le logo cabinet en variante fond sombre,
 * son nom, et un sous-titre court.
 *
 * Sur le domaine Gëstu (app.gestugroup.com), useBranding retourne null —
 * dans ce cas le composant renvoie null et le caller utilise les composants
 * Vault standards.
 */

interface BrandedAuthHeaderProps {
  /** 'login' = format compact ; 'hub' = format plus large */
  layout?: 'login' | 'hub'
}

export function BrandedAuthHeader({ layout = 'login' }: BrandedAuthHeaderProps): JSX.Element | null {
  const { branding } = useBranding()
  if (!branding) return null

  const logoHeight = layout === 'hub' ? 64 : 52
  const titleSize = layout === 'hub' ? 'text-[26px]' : 'text-[20px]'
  const subtitleSize = layout === 'hub' ? 'text-[12px]' : 'text-[11px]'
  // Surface claire → logo posé tel quel (variante fond clair) + texte foncé.
  const isLight = branding.brand_surface_mode === 'light'

  return (
    <div className="flex flex-col items-center gap-3">
      <Logo variant={isLight ? 'light' : 'dark'} height={logoHeight} />
      <div className="text-center">
        <h1 className={`${titleSize} font-extrabold tracking-[0.2px] leading-tight ${isLight ? 'text-gray-900' : 'text-white'}`}>
          {branding.cabinet_name}
        </h1>
        <p className={`mt-1 ${subtitleSize} font-semibold uppercase tracking-[2px] ${isLight ? 'text-gray-500' : 'text-white/55'}`}>
          Plateforme d&apos;audit
        </p>
      </div>
    </div>
  )
}

/**
 * Pied de page "Powered by Gëstu" — obligatoire sur les écrans brandés.
 * Caché sur le domaine Gëstu (où branding est null).
 */
export function PoweredByGestu({ className = '' }: { className?: string }): JSX.Element | null {
  const { branding } = useBranding()
  if (!branding) return null
  const isLight = branding.brand_surface_mode === 'light'
  return (
    <div className={`text-center text-[10px] tracking-[0.4px] ${isLight ? 'text-gray-400' : 'text-white/35'} ${className}`}>
      Powered by <span className={`font-semibold ${isLight ? 'text-gray-600' : 'text-white/55'}`}>G&euml;stu</span>
    </div>
  )
}
