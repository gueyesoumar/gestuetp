// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

/**
 * Helper d'écriture de la piste d'audit (activity_log) depuis les Edge Functions —
 * événements SÉMANTIQUES des actions passant par service_role (que les triggers DB
 * ne captent pas, faute d'auth.uid). Le trigger BEFORE INSERT de activity_log
 * calcule seq/prev_hash/hash (chaîne par organisation).
 *
 * FAIL-OPEN strict : ne jette jamais, ne renvoie rien — un échec de journalisation
 * ne doit jamais casser l'action métier appelante. Les erreurs sont loggées.
 *
 * actor_label est laissé nul : l'UI résout le nom courant via actor_user_id → users
 * (source de vérité), actor_label ne servant que de repli pour les cas dénormalisés.
 */
export interface ActivityEntry {
  organizationId: string
  actorUserId?: string | null
  action: string                 // ex 'entity.created', 'assessment.approved'
  targetType?: string | null     // 'entity' | 'mission' | 'assessment' | ...
  targetId?: string | null
  targetLabel?: string | null
  summary?: string | null
  metadata?: Record<string, unknown>
}

export async function logActivity(admin: SupabaseClient, e: ActivityEntry): Promise<void> {
  try {
    const { error } = await (admin.from('activity_log') as any).insert({
      organization_id: e.organizationId,
      actor_user_id: e.actorUserId ?? null,
      action: e.action,
      target_type: e.targetType ?? null,
      target_id: e.targetId ?? null,
      target_label: e.targetLabel ?? null,
      summary: e.summary ?? null,
      metadata: e.metadata ?? {},
      source: 'edge',
    })
    if (error) console.error('[audit-log]', e.action, error.message)
  } catch (err) {
    console.error('[audit-log]', e.action, err instanceof Error ? err.message : String(err))
  }
}
