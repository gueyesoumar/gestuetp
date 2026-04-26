import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

export interface CabinetBrandingRow {
  organization_id: string
  logo_light_url: string | null
  logo_dark_url: string | null
  primary_color: string | null
  accent_color: string | null
  support_email: string | null
  email_from_name: string | null
  footer_text: string | null
  updated_at: string
}

export interface CabinetDomainRow {
  id: string
  hostname: string
  is_verified: boolean
  ssl_status: 'pending' | 'issued' | 'error'
  verification_token: string
  verified_at: string | null
  last_checked_at: string | null
  last_error: string | null
  created_at: string
}

interface State {
  branding: CabinetBrandingRow | null
  domains: CabinetDomainRow[]
  loading: boolean
  error: string | null
}

/**
 * Charge le branding et la liste des domaines d'un cabinet via les Edge Functions
 * admin-cabinet-branding (action: get) et admin-cabinet-domain (action: list).
 * Toutes deux requièrent platform_owner côté serveur.
 */
export function useCabinetBrandingAdmin(cabinetId: string) {
  const [state, setState] = useState<State>({ branding: null, domains: [], loading: true, error: null })

  const refetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [brandingRes, domainsRes] = await Promise.all([
        supabase.functions.invoke('admin-cabinet-branding', {
          body: { action: 'get', cabinet_id: cabinetId },
        }),
        supabase.functions.invoke('admin-cabinet-domain', {
          body: { action: 'list', cabinet_id: cabinetId },
        }),
      ])

      if (brandingRes.error) throw new Error(brandingRes.error.message)
      if (domainsRes.error) throw new Error(domainsRes.error.message)

      const branding = brandingRes.data?.branding ?? null
      const domains = domainsRes.data?.domains ?? []
      setState({ branding, domains, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lecture impossible'
      setState({ branding: null, domains: [], loading: false, error: message })
    }
  }, [cabinetId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return { ...state, refetch }
}
