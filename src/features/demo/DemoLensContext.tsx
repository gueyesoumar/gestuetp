import { createContext, useContext, useCallback, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * « Lentille » du mode démo (E4 — Vague 2). Bascule EXPLICITE, par navigateur :
 * quand elle est active, les écrans à valeur du propriétaire (score de confiance,
 * dashboards Comply) incluent SES données de démonstration, clairement étiquetées.
 *
 * Elle n'élargit la visibilité qu'aux propres données de démo (demo_owner_id =
 * l'utilisateur courant) et JAMAIS aux agrégats réels / partagés (facturation,
 * quotas, supervision, tuiles clients) qui gardent leur filtre is_demo = false.
 * is_demo n'est pas une frontière de sécurité — la donnée reste cloisonnée par RLS.
 */
const KEY = 'gestu.demo.lens'

interface DemoLensValue {
  lensOn: boolean
  setLensOn: (v: boolean) => void
}

const DemoLensContext = createContext<DemoLensValue>({ lensOn: false, setLensOn: () => {} })

export function DemoLensProvider({ children }: { children: ReactNode }): JSX.Element {
  const [lensOn, setState] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })
  const setLensOn = useCallback((v: boolean) => {
    setState(v)
    try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* stockage indisponible */ }
  }, [])
  return <DemoLensContext.Provider value={{ lensOn, setLensOn }}>{children}</DemoLensContext.Provider>
}

export function useDemoLens(): DemoLensValue {
  return useContext(DemoLensContext)
}

/**
 * Fragment de filtre PostgREST pour une requête « sensible à la lentille » sur une
 * table portant is_demo + demo_owner_id : renvoie la clause `.or(...)` à appliquer.
 * - lentille active : réel (is_demo=false) OU ma démo (demo_owner_id = uid) ;
 * - sinon : réel uniquement.
 */
export function demoLensFilter(lensOn: boolean, uid: string | null): string {
  return lensOn && uid ? `is_demo.eq.false,demo_owner_id.eq.${uid}` : 'is_demo.eq.false'
}
