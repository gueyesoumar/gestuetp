import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

/**
 * « Lentille » du mode démo (E4 — Vague 2). Bascule EXPLICITE : quand elle est active,
 * les écrans à valeur du propriétaire (score de confiance, dashboards Comply) incluent
 * SES données de démonstration, clairement étiquetées.
 *
 * Persistée CÔTÉ SERVEUR (table demo_preferences, RLS user-owned) pour être cohérente
 * sur tous les appareils. localStorage sert de cache de premier rendu (évite le
 * clignotement) ; le serveur reste la source de vérité et réconcilie au montage.
 *
 * Elle n'élargit la visibilité qu'aux propres données de démo (demo_owner_id =
 * l'utilisateur courant) et JAMAIS aux agrégats réels / partagés qui gardent leur
 * filtre is_demo = false. is_demo n'est pas une frontière de sécurité (RLS cabinet).
 */
const KEY = 'gestu.demo.lens'

interface DemoLensValue {
  lensOn: boolean
  setLensOn: (v: boolean) => void
}

const DemoLensContext = createContext<DemoLensValue>({ lensOn: false, setLensOn: () => {} })

export function DemoLensProvider({ children }: { children: ReactNode }): JSX.Element {
  const { profile } = useAuth()
  const uid = profile?.id ?? null
  const [lensOn, setState] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })

  // Source de vérité : la préférence serveur, chargée dès que l'utilisateur est connu.
  useEffect(() => {
    if (!uid) return
    const ac = new AbortController()
    void (async () => {
      const { data, error } = await supabase
        .from('demo_preferences')
        .select('lens_on')
        .eq('user_id', uid)
        .abortSignal(ac.signal)
        .maybeSingle()
      if (ac.signal.aborted || error || !data) return
      const v = !!(data as { lens_on: boolean }).lens_on
      setState(v)
      try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* stockage indisponible */ }
    })()
    return () => ac.abort()
  }, [uid])

  const setLensOn = useCallback((v: boolean) => {
    setState(v)
    try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* stockage indisponible */ }
    if (uid) {
      void supabase
        .from('demo_preferences')
        .upsert({ user_id: uid, lens_on: v, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        .then(({ error }) => { if (error) console.warn('[demo-lens] persist:', error.message) })
    }
  }, [uid])

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
