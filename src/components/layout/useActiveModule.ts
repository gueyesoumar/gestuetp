import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Module workspace courant, CONSERVÉ sur les pages « chrome » partagées (compte,
// notifications, organisation, aide, support) pour ne pas retomber dans l'édition de
// base quand on ouvre son profil depuis un module. Source de vérité = préfixe d'URL ;
// sur une page chrome on reprend le dernier module (sessionStorage) ; sur une page de
// base on efface. Rend 'risk' | 'vendor' | 'policy' | null.
export type ModuleKey = 'risk' | 'vendor' | 'policy'
const MODULES: { key: ModuleKey; prefix: string }[] = [
  { key: 'risk', prefix: '/risque' },
  { key: 'vendor', prefix: '/fournisseurs' },
  { key: 'policy', prefix: '/politiques' },
]
const CHROME = ['/compte', '/profil', '/notifications', '/organisation', '/membres', '/piste-audit', '/aide', '/demandes-support']
const STORE_KEY = 'gestu-active-module'

export function useActiveModule(): ModuleKey | null {
  const { pathname } = useLocation()
  const direct = MODULES.find((m) => pathname === m.prefix || pathname.startsWith(`${m.prefix}/`))?.key ?? null
  const isChrome = CHROME.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  useEffect(() => {
    try {
      if (direct) sessionStorage.setItem(STORE_KEY, direct)
      else if (!isChrome) sessionStorage.removeItem(STORE_KEY)
    } catch { /* stockage indisponible */ }
  }, [direct, isChrome])

  if (direct) return direct
  if (isChrome) {
    try {
      const v = sessionStorage.getItem(STORE_KEY)
      return v === 'risk' || v === 'vendor' || v === 'policy' ? v : null
    } catch { return null }
  }
  return null
}
