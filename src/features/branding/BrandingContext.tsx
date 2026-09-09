import { createContext, useEffect, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { generatePalette } from './colorUtils'
import type { DarkLogoTreatment, BrandSurfaceMode } from './extractColorsFromImage'
import { applyBrandingVars, writeBrandingCache, clearBrandingCache, getNeutralDefaults, readCachedBranding } from './brandingCache'

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
  dark_logo_treatment: DarkLogoTreatment | null
  brand_surface_mode: BrandSurfaceMode | null
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

function computeHostContext(): { hostname: string; isCustomDomain: boolean } {
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
  const isCustomDomain = hostname.length > 0 && !NEUTRAL_HOSTNAMES.has(hostname) && !hostname.endsWith('.vercel.app')
  return { hostname, isCustomDomain }
}

// Garde de forme minimale sur le payload en cache (que nous avons nous-mêmes
// sérialisé) — évite un cast non vérifié.
function isCabinetBranding(x: unknown): x is CabinetBranding {
  return typeof x === 'object' && x !== null && typeof (x as { cabinet_id?: unknown }).cabinet_id === 'string'
}

// État initial réhydraté depuis le cache : sur un domaine cabinet déjà visité,
// le branding est disponible dès le 1er rendu (loading reste true → on
// revalide en arrière-plan). Supprime le flash structurel vault → surface claire.
function initialBrandingState(): BrandingState {
  const { hostname, isCustomDomain } = computeHostContext()
  const cached = isCustomDomain ? readCachedBranding(hostname) : null
  return { branding: isCabinetBranding(cached) ? cached : null, isCustomDomain, loading: true }
}

export const BrandingContext = createContext<BrandingState>({
  branding: null,
  isCustomDomain: false,
  loading: true,
})

interface BrandingProviderProps {
  children: ReactNode
}

export function BrandingProvider({ children }: BrandingProviderProps): JSX.Element {
  const [state, setState] = useState<BrandingState>(initialBrandingState)

  useEffect(() => {
    const { hostname, isCustomDomain } = computeHostContext()

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
    // Tant que la résolution est en cours, ne rien toucher : on préserve les
    // variables déjà appliquées au boot depuis le cache (anti-FOUC). On applique
    // (ou on nettoie) seulement une fois la résolution terminée.
    if (state.loading) return

    const root = document.documentElement
    const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : ''
    const neutral = getNeutralDefaults()
    const iconEl = document.querySelector<HTMLLinkElement>("link[rel~='icon']")

    if (state.branding) {
      const primary = state.branding.primary_color ?? DEFAULT_PRIMARY
      const accent = state.branding.accent_color ?? DEFAULT_ACCENT

      // Variables sémantiques + override des CSS vars Tailwind theme (forest-*
      // et gold-*), dérivées par décalage de luminosité depuis la couleur cabinet.
      const vars: Record<string, string> = { '--brand-primary': primary, '--brand-accent': accent }
      const forestPalette = generatePalette(primary)
      const goldPalette = generatePalette(accent)
      if (forestPalette) for (const [shade, hex] of Object.entries(forestPalette)) vars[`--color-forest-${shade}`] = hex
      if (goldPalette) for (const [shade, hex] of Object.entries(goldPalette)) vars[`--color-gold-${shade}`] = hex
      applyBrandingVars(vars)

      // Onglet navigateur : favicon + titre au nom du cabinet (marque blanche).
      const title = state.branding.cabinet_name || null
      const favicon = state.branding.logo_light_url || null
      if (title) document.title = title
      if (iconEl && favicon) iconEl.setAttribute('href', favicon)

      // Mémorise le thème calculé + le payload pour un boot synchrone au prochain
      // chargement (variables au boot + réhydratation du state React).
      writeBrandingCache(hostname, { branding: state.branding, vars, title, favicon })
    } else {
      // Pas de branding : sémantiques par défaut + retrait des overrides pour
      // retomber sur les valeurs du @theme, restauration de l'onglet, purge cache.
      root.style.setProperty('--brand-primary', DEFAULT_PRIMARY)
      root.style.setProperty('--brand-accent', DEFAULT_ACCENT)
      const shades: Array<'50' | '100' | '300' | '500' | '700' | '900'> = ['50', '100', '300', '500', '700', '900']
      for (const s of shades) {
        root.style.removeProperty(`--color-forest-${s}`)
        root.style.removeProperty(`--color-gold-${s}`)
      }
      if (neutral.title !== null) document.title = neutral.title
      if (iconEl && neutral.favicon !== null) iconEl.setAttribute('href', neutral.favicon)
      clearBrandingCache(hostname)
    }
  }, [state.branding, state.loading])

  return <BrandingContext.Provider value={state}>{children}</BrandingContext.Provider>
}
