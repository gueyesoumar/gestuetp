import { createContext, useEffect, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * BrandingProvider — résolution du tenant par hostname AVANT auth.
 *
 * Charge le branding cabinet via l'Edge Function resolve-tenant-by-hostname
 * (publique, service-role côté backend). Si le hostname est neutre (Gëstu,
 * localhost) ou non-mappé, on tombe en branding par défaut Gëstu.
 *
 * Côté frontend, on n'a aucune logique sur le flag white_label_branding —
 * la résolution serveur retourne 404 si le flag est OFF pour le cabinet.
 *
 * Les CSS variables --brand-primary et --brand-accent sont injectées sur
 * <html> au mount pour que Tailwind/inline styles puissent y faire référence.
 */

export interface CabinetBranding {
  cabinet_id: string
  cabinet_name: string
  cabinet_slug: string
  logo_light_url: string | null
  logo_dark_url: string | null
  primary_color: string | null
  accent_color: string | null
  support_email: string | null
  email_from_name: string | null
  footer_text: string | null
}

export interface BrandingState {
  branding: CabinetBranding | null
  isCustomDomain: boolean
  loading: boolean
}

const NEUTRAL_HOSTNAMES = new Set([
  'app.gestugroup.com',
  'gestugroup.com',
  'www.gestugroup.com',
  'localhost',
  '127.0.0.1',
])

const DEFAULT_PRIMARY = '#1B4332'
const DEFAULT_ACCENT = '#D4A843'

export const BrandingContext = createContext<BrandingState>({
  branding: null,
  isCustomDomain: false,
  loading: true,
})

interface BrandingProviderProps {
  children: ReactNode
}

export function BrandingProvider({ children }: BrandingProviderProps): JSX.Element {
  const [state, setState] = useState<BrandingState>({ branding: null, isCustomDomain: false, loading: true })

  useEffect(() => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
    const isCustomDomain = hostname.length > 0 && !NEUTRAL_HOSTNAMES.has(hostname) && !hostname.endsWith('.vercel.app')

    if (!isCustomDomain) {
      setState({ branding: null, isCustomDomain: false, loading: false })
      return
    }

    const abort = new AbortController()
    void (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('resolve-tenant-by-hostname', {
          body: { hostname },
        })
        if (abort.signal.aborted) return
        if (error || !data || !data.branding) {
          setState({ branding: null, isCustomDomain: true, loading: false })
          return
        }
        setState({ branding: data.branding as CabinetBranding, isCustomDomain: true, loading: false })
      } catch (err) {
        if (abort.signal.aborted) return
        console.warn('[BrandingProvider] resolve failed:', err instanceof Error ? err.message : err)
        setState({ branding: null, isCustomDomain: true, loading: false })
      }
    })()

    return () => abort.abort()
  }, [])

  useLayoutEffect(() => {
    const root = document.documentElement
    const primary = state.branding?.primary_color ?? DEFAULT_PRIMARY
    const accent = state.branding?.accent_color ?? DEFAULT_ACCENT
    root.style.setProperty('--brand-primary', primary)
    root.style.setProperty('--brand-accent', accent)
  }, [state.branding])

  return <BrandingContext.Provider value={state}>{children}</BrandingContext.Provider>
}
