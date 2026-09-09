import { ShieldCheck, Lock, KeyRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useBranding } from './useBranding'
import { Logo } from './Logo'

/**
 * BrandedBrandPanel — équivalent white-label de VaultBrandPanel : colonne gauche
 * « récit » du login split, aux couleurs et au logo du cabinet. S'adapte à la
 * polarité de surface (light/dark) pour que le logo soit posé tel quel, sans
 * pastille. Rien sur le domaine Gëstu (branding null) — le login standard prend
 * le relais avec VaultBrandPanel.
 */
function Badge({ icon, ink, children }: { icon: ReactNode; ink: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex items-center gap-2" style={{ color: ink }}>
      {icon}
      <span className="text-[11px] font-medium uppercase tracking-wider">{children}</span>
    </div>
  )
}

export function BrandedBrandPanel(): JSX.Element | null {
  const { branding } = useBranding()
  if (!branding) return null

  const isLight = branding.brand_surface_mode === 'light'
  const panelBg = isLight
    ? 'linear-gradient(160deg, #FFFFFF 0%, color-mix(in srgb, var(--brand-primary) 10%, #FFFFFF) 100%)'
    : 'linear-gradient(160deg, color-mix(in srgb, var(--brand-primary) 82%, #000) 0%, var(--brand-primary) 55%, color-mix(in srgb, var(--brand-primary) 68%, #000) 100%)'
  const ink = isLight ? '#1A1F1D' : '#FFFFFF'
  const inkMuted = isLight ? 'rgba(17,24,39,0.60)' : 'rgba(255,255,255,0.62)'
  const accent = 'var(--brand-accent)'

  return (
    <div
      className="relative hidden w-[56%] max-w-[720px] flex-col justify-between overflow-hidden px-16 py-14 lg:flex"
      style={{ background: panelBg }}
    >
      {/* logo cabinet — posé tel quel selon la polarité */}
      <div className="relative">
        <Logo variant={isLight ? 'light' : 'dark'} height={46} />
      </div>

      {/* accroche */}
      <div className="relative max-w-[460px]">
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
          style={{ borderColor: 'color-mix(in srgb, var(--brand-accent) 42%, transparent)' }}
        >
          <span className="block h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px]" style={{ color: accent }}>
            Plateforme d&apos;audit
          </span>
        </div>
        <h2 className="mb-[18px] text-[40px] font-light leading-[1.12] tracking-[-0.5px]" style={{ color: ink }}>
          {branding.cabinet_name}
        </h2>
        <p className="max-w-[400px] text-[15px] leading-[1.65]" style={{ color: inkMuted }}>
          Audits multi-référentiels, supervision et gestion des risques — sur une plateforme
          sécurisée, cloisonnée et probante.
        </p>
      </div>

      {/* badges de confiance (features plateforme, valables pour tout cabinet) */}
      <div className="relative flex items-center gap-6">
        <Badge icon={<ShieldCheck size={14} strokeWidth={1.6} />} ink={inkMuted}>Hébergement souverain</Badge>
        <Badge icon={<Lock size={14} strokeWidth={1.6} />} ink={inkMuted}>Chiffrement AES-256</Badge>
        <Badge icon={<KeyRound size={14} strokeWidth={1.6} />} ink={inkMuted}>MFA · AAL2</Badge>
      </div>
    </div>
  )
}
