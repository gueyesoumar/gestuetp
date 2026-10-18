// Registre canonique des cles d'entitlement (fondation RFC 0018 D1).
// Classe les droits d'une organisation pour la surface « Abonnement et acces »
// et fournit le badge de provenance. Front/back partageront ce registre quand
// les cles seront prefixees (Phase 2b) ; en attendant, on classe par capacite.

export type EntitlementNature = 'module' | 'quota' | 'other'

// Cles portant un plafond metre. Le prefixe `quota.` est tolere d'avance (Phase 2b).
const QUOTA_KEYS = new Set(['users', 'missions'])

function stripPrefix(key: string): string {
  const i = key.indexOf('.')
  return i === -1 ? key : key.slice(i + 1)
}

/**
 * Classe un droit : quota si la cle est un quota connu, module s'il porte une
 * capacite, « autre » sinon (droits manuels de confort, credits, etc.).
 */
export function classifyEntitlement(entry: { key: string; capability: string | null }): EntitlementNature {
  if (QUOTA_KEYS.has(stripPrefix(entry.key))) return 'quota'
  if (entry.capability != null) return 'module'
  return 'other'
}

export interface SourceBadge { label: string; className: string }

/** Badge de provenance d'un droit (Plan / Surcharge / Manuel / Socle). */
export function sourceBadge(source: string): SourceBadge {
  if (source.startsWith('plan:')) return { label: 'Plan', className: 'bg-emerald-50 text-emerald-700' }
  if (source === 'manual') return { label: 'Manuel', className: 'bg-gold-100 text-gold-700' }
  if (source === 'override') return { label: 'Surchargé', className: 'bg-amber-50 text-amber-700' }
  if (source === 'provisioning') return { label: 'Socle', className: 'bg-gray-100 text-gray-600' }
  return { label: source, className: 'bg-gray-100 text-gray-500' }
}
