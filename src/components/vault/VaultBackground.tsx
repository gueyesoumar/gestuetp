/**
 * VaultBackground — fond dégradé sombre pour login / hub / set-password.
 * Utilise les CSS variables --brand-primary et --brand-accent injectées
 * par BrandingProvider. Sur le domaine Gëstu ces variables valent
 * #1B4332 / #D4A843 ; sur un domaine cabinet personnalisé, elles prennent
 * les couleurs du branding.
 */

import type { ReactNode } from 'react'

interface VaultBackgroundProps {
  children: ReactNode
}

const HEX_GRID_CSS = `
  radial-gradient(
    ellipse 80px 80px at 40px 46px,
    color-mix(in srgb, var(--brand-accent) 3%, transparent) 0%,
    transparent 70%
  ),
  radial-gradient(
    ellipse 80px 80px at 120px 46px,
    color-mix(in srgb, var(--brand-accent) 2%, transparent) 0%,
    transparent 70%
  )
`

export function VaultBackground({ children }: VaultBackgroundProps): JSX.Element {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background:
          'linear-gradient(160deg, color-mix(in srgb, var(--brand-primary, #1B4332) 35%, black) 0%, var(--brand-primary, #1B4332) 50%, color-mix(in srgb, var(--brand-primary, #1B4332) 80%, black) 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: HEX_GRID_CSS,
          backgroundSize: '160px 92px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
