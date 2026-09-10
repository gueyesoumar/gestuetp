import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useBranding } from '../features/branding/useBranding'
import { supabase } from '../lib/supabase'
import { setTenantDeniedFlag } from '../lib/tenantAccess'

/**
 * Garde d'accès par domaine marque blanche. Sur un domaine cabinet (branding
 * résolu), coupe la session si le compte connecté n'appartient pas à ce cabinet
 * (staff, client, ou super-admin) — via le RPC serveur user_belongs_to_cabinet.
 * Les données sont déjà cloisonnées par RLS ; ceci ajoute la cohérence d'accès.
 *
 * Non bloquant (rend les enfants) ; agit en effet de bord. Fail-open en cas
 * d'erreur RPC (on ne verrouille pas un compte légitime sur incident réseau).
 */

export function TenantAccessGuard({ children }: { children: ReactNode }): JSX.Element {
  const { session, profile, loading, signOut } = useAuth()
  const { branding, loading: brandingLoading } = useBranding()
  const checkedKey = useRef<string | null>(null)

  useEffect(() => {
    if (loading || brandingLoading) return
    // Domaine neutre (pas de branding) ou pas authentifié → aucune restriction.
    if (!session || !profile || !branding) return

    const key = `${profile.id}:${branding.cabinet_id}`
    if (checkedKey.current === key) return
    checkedKey.current = key

    let cancelled = false
    void (async () => {
      const { data, error } = await supabase.rpc('user_belongs_to_cabinet', { p_cabinet_id: branding.cabinet_id })
      if (cancelled) return
      if (error) {
        console.error('[TenantAccessGuard] vérification impossible:', error.message)
        return // fail-open : on ne déconnecte pas sur erreur
      }
      if (data === false) {
        setTenantDeniedFlag()
        await signOut()
      }
    })()

    return () => { cancelled = true }
  }, [session, profile, branding, loading, brandingLoading, signOut])

  return <>{children}</>
}
