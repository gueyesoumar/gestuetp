import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction'

/**
 * Toggle global d'une fonctionnalité (kill switch plateforme).
 * Affecte TOUS les cabinets, quel que soit leur plan ou leurs overrides.
 *
 * Purge toutes les entrées ff:* du sessionStorage car la résolution
 * `useFeatureFlag` côté utilisateur est invalidée pour tout le monde.
 */
export async function toggleGlobalFlag(
  slug: string,
  enabled: boolean,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!reason.trim()) return { ok: false, error: 'Motif requis' }

  const res = await invokeEdgeFunction<{ success?: boolean }>('admin-feature-flags', {
    action: 'toggle', slug, enabled, reason,
  })
  if (!res.ok) return { ok: false, error: res.error }

  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith('ff:')) keys.push(k)
    }
    keys.forEach((k) => sessionStorage.removeItem(k))
  } catch {
    // sessionStorage indisponible — ignorer
  }

  return { ok: true }
}
