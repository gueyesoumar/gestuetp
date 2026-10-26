// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Helper de création de notifications in-app depuis les Edge Functions (RFC n°17).
 * Insert via service_role (la table notifications n'a pas de policy INSERT pour les
 * utilisateurs : seul le backend crée les notifications).
 *
 * FAIL-SOFT : ne jette jamais - un échec de notification ne doit pas casser l'action
 * métier appelante. Les erreurs sont loggées. À appeler APRÈS l'action principale.
 */
export interface NotifyInput {
  userId: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  metadata?: Record<string, unknown>
}

/** Retire les destinataires ayant masqué ce type en préférences in-app (Lot 4).
 *  Fail-open : en cas d'erreur de lecture des préférences, on n'écarte personne. */
async function filterByPreferences(admin: SupabaseClient, ids: string[], type: string): Promise<string[]> {
  try {
    const { data, error } = await admin
      .from('notification_preferences')
      .select('user_id, muted_types')
      .in('user_id', ids)
    if (error || !data) return ids
    const muted = new Set(
      (data as { user_id: string; muted_types: string[] }[])
        .filter((r) => (r.muted_types ?? []).includes(type))
        .map((r) => r.user_id),
    )
    return ids.filter((id) => !muted.has(id))
  } catch { return ids }
}

export async function notify(admin: SupabaseClient, n: NotifyInput): Promise<void> {
  if (!n.userId) return
  await notifyMany(admin, [n.userId], n)
}

/** Notifie plusieurs destinataires (dédupliqués, valeurs vides ignorées, préférences respectées). */
export async function notifyMany(admin: SupabaseClient, userIds: (string | null | undefined)[], n: Omit<NotifyInput, 'userId'>): Promise<void> {
  const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))]
  if (unique.length === 0) return
  try {
    const ids = await filterByPreferences(admin, unique, n.type)
    if (ids.length === 0) return
    const rows = ids.map((user_id) => ({
      user_id, type: n.type, title: n.title,
      body: n.body ?? null, link: n.link ?? null, metadata: n.metadata ?? {},
    }))
    const { error } = await admin.from('notifications').insert(rows as any)
    if (error) console.error('[notifyMany]', n.type, error.message)
  } catch (e) { console.error('[notifyMany] unexpected', n.type, e) }
}
