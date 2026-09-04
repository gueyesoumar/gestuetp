import type { ReactNode } from 'react'
import { VaultBackground } from '../../../components/vault/VaultBackground'

// Coquille plein écran pour les étapes MFA (enrôlement, challenge, chargement).
// Posée sur le fond « vault » branché, en continuité avec la page de connexion.

export function MfaShell({ title, subtitle, children }: {
  title: string
  subtitle?: string
  children: ReactNode
}): JSX.Element {
  return (
    <VaultBackground>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-white/10 p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: 'var(--color-forest-900)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="1.8" aria-hidden="true">
                <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </span>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--color-forest-900)' }}>{title}</h1>
              {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
            </div>
          </div>
          {children}
        </div>
      </div>
    </VaultBackground>
  )
}

export function MfaLoader(): JSX.Element {
  return (
    <VaultBackground>
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-6 h-6 rounded-full border-2 border-white/40 border-t-transparent animate-spin" aria-label="Chargement" role="status" />
      </div>
    </VaultBackground>
  )
}
