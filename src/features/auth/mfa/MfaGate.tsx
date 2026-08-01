import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { MfaEnrollment } from './MfaEnrollment'
import { MfaChallenge } from './MfaChallenge'
import { MfaLoader } from './MfaShell'

// Barrière MFA montée au-dessus des routes applicatives. La MFA est obligatoire
// pour tous : un compte sans facteur vérifié est forcé à l'enrôlement ; un compte
// avec facteur doit passer le challenge (AAL2) avant tout accès.
//
// Exemptions : pages d'authentification publiques (login, définition de mot de
// passe, désinscription) — sinon on bloquerait le parcours avant même l'enrôlement.

const EXEMPT_PREFIXES = ['/login', '/set-password', '/unsubscribe']

export function MfaGate({ children }: { children: ReactNode }): JSX.Element {
  const { session, loading, aal, mfaLoading } = useAuth()
  const { pathname } = useLocation()

  if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) return <>{children}</>
  if (!session) return <>{children}</>
  if (loading || mfaLoading || !aal) return <MfaLoader />

  // Aucun facteur vérifié atteignable (next = aal1) → enrôlement obligatoire.
  if (aal.next === 'aal1') return <MfaEnrollment />
  // Facteur présent mais session encore en AAL1 → challenge requis.
  if (aal.current === 'aal1' && aal.next === 'aal2') return <MfaChallenge />

  return <>{children}</>
}
