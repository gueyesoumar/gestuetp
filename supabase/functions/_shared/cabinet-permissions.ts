// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Vérifie si un utilisateur a une permission cabinet donnée.
 * Wrapper sur la fonction SQL public.user_has_cabinet_permission(uuid, text).
 *
 * Retourne false en cas d'erreur RPC (fail-closed).
 *
 * Usage typique :
 *   if (!(await hasCabinetPerm(admin, callerProfile.id, 'can_create_mission'))) {
 *     return jsonResponse({ error: 'Permission can_create_mission requise' }, 403)
 *   }
 */
export async function hasCabinetPerm(
  admin: SupabaseClient,
  userId: string,
  perm: string,
): Promise<boolean> {
  const { data, error } = await (admin.rpc as any)('user_has_cabinet_permission', {
    p_user_id: userId,
    p_perm: perm,
  })
  if (error) {
    console.error(`[cabinet-permissions] RPC error for ${perm}:`, error.message)
    return false
  }
  return data === true
}
