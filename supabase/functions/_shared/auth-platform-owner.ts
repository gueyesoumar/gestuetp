import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Vérifie que l'appelant est un super-admin Gëstu actif.
 * Retourne le row `users` de l'appelant si OK, sinon une Response d'erreur prête à être renvoyée.
 *
 * Sécurité critique : toutes les Edge Functions /admin doivent l'appeler en première ligne.
 * Le caller doit transmettre l'Authorization Bearer du JWT de l'utilisateur (PAS le service-role).
 */
export interface PlatformOwner {
  id: string
  auth_id: string
  email: string
  first_name: string
  last_name: string
}

export async function requirePlatformOwner(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ owner: PlatformOwner; admin: ReturnType<typeof createClient> } | Response> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return jsonResponse({ error: 'Non autorisé' }, 401, corsHeaders)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceKey)

  // 1. Récupérer l'utilisateur Auth depuis le token
  const { data: { user: authUser }, error: authError } = await admin.auth.getUser(token)
  if (authError || !authUser) {
    return jsonResponse({ error: 'Non autorisé' }, 401, corsHeaders)
  }

  // 2. Charger le profil public.users et vérifier le flag
  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('id, auth_id, email, first_name, last_name, is_active, is_platform_owner')
    .eq('auth_id', authUser.id)
    .single()

  if (profileError || !profile) {
    return jsonResponse({ error: 'Profil introuvable' }, 401, corsHeaders)
  }

  const row = profile as { id: string; auth_id: string; email: string; first_name: string; last_name: string; is_active: boolean; is_platform_owner: boolean }
  if (!row.is_active || !row.is_platform_owner) {
    return jsonResponse({ error: 'Accès super-admin refusé' }, 403, corsHeaders)
  }

  return {
    owner: {
      id: row.id,
      auth_id: row.auth_id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
    },
    admin,
  }
}

/**
 * Insère une ligne admin_audit_log. Le motif est obligatoire et trimé.
 */
export async function logAdminAction(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  reason: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const trimmed = reason.trim()
  if (!trimmed) throw new Error('Le motif est obligatoire')

  // deno-lint-ignore no-explicit-any
  const { error } = await (admin.from('admin_audit_log') as any).insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    reason: trimmed,
    metadata,
  })

  if (error) {
    console.error('[admin-audit-log] insert failed:', error.message)
    throw new Error('Audit log insert failed')
  }
}

function jsonResponse(data: Record<string, unknown>, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
