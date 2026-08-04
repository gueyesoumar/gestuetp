import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Capability } from '../../types/database.types'

// Résolveur d'édition/capacités AU RUNTIME (RFC 0001, Phase 2 — incrément 1).
//
// Remplace le fork de build `VITE_PRODUCT`/`isRegul` (retiré) :
// une fois l'utilisateur authentifié, on résout ses capacités actives et ses
// overrides de vocab via `my_capabilities()` / `my_vocab()`. RFC 0002 P4a : le
// front ne lit PLUS l'édition — la persona (Comply/Regul) est déduite des
// capacités (ex. `supervision`). L'édition ne subsiste que côté données
// (seeding des capacités, défauts serveur) — P4b la retirera.
//
// Rôle=client (portail) : `get_my_organization_id()` est neutralisé côté RLS
// (00134) → résolution via l'org superviseur (my_capabilities/my_vocab, 00161).

interface EditionState {
  loading: boolean
  capabilities: Set<Capability>
  hasCapability: (cap: Capability) => boolean
  /** Overrides de vocabulaire de l'org (RFC 0002, P1) — vide si non personnalisé. */
  vocab: Map<string, string>
}

const EditionContext = createContext<EditionState | null>(null)

export function EditionProvider({ children }: { children: ReactNode }): JSX.Element {
  const { profile } = useAuth()
  const [capabilities, setCapabilities] = useState<Set<Capability>>(new Set())
  const [vocab, setVocab] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const orgId = profile?.organization_id
    if (!orgId) {
      setCapabilities(new Set())
      setVocab(new Map())
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    setLoading(true)

    void (async () => {
      const [capRes, vocRes] = await Promise.all([
        supabase.rpc('my_capabilities').abortSignal(ctrl.signal),
        supabase.rpc('my_vocab').abortSignal(ctrl.signal),
      ])
      if (ctrl.signal.aborted) return
      if (capRes.error) console.error('capabilities resolve:', capRes.error.message)
      if (vocRes.error) console.error('vocab resolve:', vocRes.error.message)

      const caps = Array.isArray(capRes.data) ? (capRes.data as Capability[]) : []
      setCapabilities(new Set(caps))
      const vocRows = Array.isArray(vocRes.data) ? (vocRes.data as Array<{ key: string; value: string }>) : []
      setVocab(new Map(vocRows.map((r) => [r.key, r.value])))
      setLoading(false)
    })()

    return () => ctrl.abort()
  }, [profile?.organization_id])

  const hasCapability = (cap: Capability): boolean => capabilities.has(cap)

  return (
    <EditionContext.Provider value={{ loading, capabilities, hasCapability, vocab }}>
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
