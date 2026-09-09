/**
 * Cache local du branding cabinet résolu par hostname.
 *
 * Objectif : éliminer le FOUC (flash du thème Gëstu vert avant la marque
 * blanche). La résolution serveur (resolve-tenant-by-hostname) est asynchrone :
 * sans cache, le premier rendu peint le thème par défaut, puis bascule.
 *
 * On mémorise donc les variables de thème calculées (couleurs + titre + favicon)
 * et on les applique de façon SYNCHRONE au boot — avant le premier rendu React
 * (voir main.tsx) — puis BrandingContext réécrit le cache après résolution.
 *
 * Le cache est un simple bonus : toute erreur (quota, navigation privée) est
 * silencieuse et retombe sur le comportement asynchrone habituel.
 */

const KEY_PREFIX = 'gestu:branding:'

export interface BrandingCacheEntry {
  // Payload branding complet (CabinetBranding), pour réhydrater le state React
  // de façon synchrone au boot et éviter le flash structurel (vault sombre →
  // surface claire). Typé `unknown` ici : la validation de forme est faite côté
  // consommateur (BrandingContext.isCabinetBranding).
  branding: unknown
  vars: Record<string, string>
  title: string | null
  favicon: string | null
}

interface NeutralDefaults {
  title: string | null
  favicon: string | null
}

// Valeurs d'onglet Gëstu par défaut, capturées AVANT toute mutation de marque
// blanche, pour pouvoir restaurer si aucun branding n'est finalement résolu.
let neutralDefaults: NeutralDefaults | null = null

function iconEl(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>("link[rel~='icon']")
}

function cacheKey(hostname: string): string {
  return KEY_PREFIX + hostname
}

export function readBrandingCache(hostname: string): BrandingCacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(hostname))
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as BrandingCacheEntry).vars !== 'object' ||
      (parsed as BrandingCacheEntry).vars === null
    ) {
      return null
    }
    return parsed as BrandingCacheEntry
  } catch {
    return null
  }
}

export function writeBrandingCache(hostname: string, entry: BrandingCacheEntry): void {
  try {
    localStorage.setItem(cacheKey(hostname), JSON.stringify(entry))
  } catch {
    // quota atteint / navigation privée : le cache est optionnel, on ignore
  }
}

// Payload branding en cache pour ce hostname (non validé — le consommateur
// doit vérifier la forme avant usage). null si absent.
export function readCachedBranding(hostname: string): unknown {
  return readBrandingCache(hostname)?.branding ?? null
}

export function clearBrandingCache(hostname: string): void {
  try {
    localStorage.removeItem(cacheKey(hostname))
  } catch {
    // ignore
  }
}

export function applyBrandingVars(vars: Record<string, string>): void {
  const root = document.documentElement
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value)
}

// Capture (une seule fois) les valeurs d'onglet par défaut avant mutation.
export function getNeutralDefaults(): NeutralDefaults {
  if (neutralDefaults === null) {
    neutralDefaults = { title: document.title, favicon: iconEl()?.getAttribute('href') ?? null }
  }
  return neutralDefaults
}

/**
 * Appelé au tout début du boot (main.tsx), avant createRoot : capture les
 * valeurs par défaut puis applique le branding en cache pour le hostname
 * courant s'il existe. Aucune requête réseau, purement synchrone.
 */
export function applyCachedBrandingAtBoot(): void {
  if (typeof window === 'undefined') return
  getNeutralDefaults()
  const hostname = window.location.hostname.toLowerCase()
  const entry = readBrandingCache(hostname)
  if (!entry) return
  applyBrandingVars(entry.vars)
  if (entry.title) document.title = entry.title
  if (entry.favicon) {
    const el = iconEl()
    if (el) el.setAttribute('href', entry.favicon)
  }
}
