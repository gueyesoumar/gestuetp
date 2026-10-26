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

export async function notify(admin: SupabaseClient, n: NotifyInput): Promise<void> {
  if (!n.userId) return
  try {
    const { error } = await admin.from('notifications').insert({
      user_id: n.userId, type: n.type, title: n.title,
      body: n.body ?? null, link: n.link ?? null, metadata: n.metadata ?? {},
    } as any)
    if (error) console.error('[notify]', n.type, error.message)
  } catch (e) { console.error('[notify] unexpected', n.type, e) }
}

/** Notifie plusieurs destinataires (dédupliqués, valeurs vides ignorées). */
export async function notifyMany(admin: SupabaseClient, userIds: (string | null | undefined)[], n: Omit<NotifyInput, 'userId'>): Promise<void> {
  const ids = [...new Set(userIds.filter((id): id is string => Boolean(id)))]
  if (ids.length === 0) return
  try {
    const rows = ids.map((user_id) => ({
      user_id, type: n.type, title: n.title,
      body: n.body ?? null, link: n.link ?? null, metadata: n.metadata ?? {},
    }))
    const { error } = await admin.from('notifications').insert(rows as any)
    if (error) console.error('[notifyMany]', n.type, error.message)
  } catch (e) { console.error('[notifyMany] unexpected', n.type, e) }
}
