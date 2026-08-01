import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Capability } from '../../types/database.types'

// Résolveur d'édition/capacités AU RUNTIME (RFC 0001, Phase 2 — incrément 1).
//
// Remplace le fork de build `VITE_PRODUCT`/`isRegul` (retiré) :
// une fois l'utilisateur authentifié, on résout l'édition de son organisation
// et ses capacités actives via les fonctions serveur `get_my_edition()` /
// `my_capabilities()` (migration 00160). INCRÉMENT 1 : le contexte est monté et
// exposé, mais AUCUN composant ne le consomme encore → zéro changement de
// comportement. Le branchement (vocab, routing, Hub) viendra aux incréments
// suivants.
//
// Rôle=client (portail) : `get_my_organization_id()` est neutralisé côté RLS
// (00134) → édition null / capacités vides. Dégradation gracieuse, sans erreur.

interface EditionState {
  loading: boolean
  edition: string | null
  capabilities: Set<Capability>
  hasCapability: (cap: Capability) => boolean
}

const EditionContext = createContext<EditionState | null>(null)

export function EditionProvider({ children }: { children: ReactNode }): JSX.Element {
  const { profile } = useAuth()
  const [edition, setEdition] = useState<string | null>(null)
  const [capabilities, setCapabilities] = useState<Set<Capability>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const orgId = profile?.organization_id
    if (!orgId) {
      setEdition(null)
      setCapabilities(new Set())
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    setLoading(true)

    void (async () => {
      const [edRes, capRes] = await Promise.all([
        supabase.rpc('get_my_edition').abortSignal(ctrl.signal),
        supabase.rpc('my_capabilities').abortSignal(ctrl.signal),
      ])
      if (ctrl.signal.aborted) return
      if (edRes.error) console.error('edition resolve:', edRes.error.message)
      if (capRes.error) console.error('capabilities resolve:', capRes.error.message)

      setEdition(typeof edRes.data === 'string' ? edRes.data : null)
      const caps = Array.isArray(capRes.data) ? (capRes.data as Capability[]) : []
      setCapabilities(new Set(caps))
      setLoading(false)
    })()

    return () => ctrl.abort()
  }, [profile?.organization_id])

  const hasCapability = (cap: Capability): boolean => capabilities.has(cap)

  return (
    <EditionContext.Provider value={{ loading, edition, capabilities, hasCapability }}>
      {children}
    </EditionContext.Provider>
  )
}

export function useEdition(): EditionState {
  const ctx = useContext(EditionContext)
  if (!ctx) throw new Error('useEdition doit être utilisé dans un EditionProvider')
  return ctx
}

export function useCapability(cap: Capability): boolean {
  return useEdition().hasCapability(cap)
}
