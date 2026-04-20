/**
 * VaultBackground — dark forest green gradient with hex grid pattern.
 * Shared between LoginPage, SetPasswordPage, and HubPage.
 */

import type { ReactNode } from 'react'

interface VaultBackgroundProps {
  children: ReactNode
}

const HEX_GRID_CSS = `
  radial-gradient(
    ellipse 80px 80px at 40px 46px,
    rgba(212, 168, 67, 0.03) 0%,
    transparent 70%
  ),
  radial-gradient(
    ellipse 80px 80px at 120px 46px,
    rgba(212, 168, 67, 0.02) 0%,
    transparent 70%
  )
`

export function VaultBackground({ children }: VaultBackgroundProps): JSX.Element {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #0D1F15 0%, #1B4332 45%, #173D2E 100%)',
      }}
    >
      {/* Hex grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: HEX_GRID_CSS,
          backgroundSize: '160px 92px',
        }}
      />
      {/* Vignette edges */}
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
