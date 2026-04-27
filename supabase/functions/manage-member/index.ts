import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

/**
 * Edge Function : manage-member
 *
 * Permet à un utilisateur disposant de can_manage_members de :
 *   - 'suspend'    → désactiver un membre (is_active = false)
 *   - 'reactivate' → réactiver un membre (is_active = true)
 *
 * Corrige le bug historique où useToggleMemberStatus appelait directement
 * supabase.from('users').update() — RLS users_update_self bloque silencieusement
 * les UPDATE cross-user, donc l'opération paraissait réussir mais ne faisait rien.
 *
 * Sécurité :
 *   - Caller actif, dans le même cabinet que la cible
 *   - Caller a can_manage_members
 *   - On refuse de se suspendre soi-même
 *   - Protection anti-bricking : on refuse de suspendre le dernier détenteur
 *     actif de can_manage_roles du cabinet
 *   - Audit log écrit dans member_audit_logs
 */

interface Payload {
  action: 'suspend' | 'reactivate'
  target_user_id: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Non autorisé' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
    if (authError || !caller) return jsonResponse({ error: 'Non autorisé' }, 401)

    const { data: callerProfile } = await admin
      .from('users')
      .select('id, organization_id, is_active')
      .eq('auth_id', caller.id)
      .single()

    if (!callerProfile || !(callerProfile as { is_active: boolean }).is_active) {
      return jsonResponse({ error: 'Profil introuvable ou désactivé' }, 403)
    }
    const cp = callerProfile as { id: string; organization_id: string }

    if (!(await hasCabinetPerm(admin, cp.id, 'can_manage_members'))) {
      return jsonResponse({ error: 'Permission can_manage_members requise' }, 403)
    }

    const body = await req.json() as Payload
    const { action, target_user_id } = body

    if (action !== 'suspend' && action !== 'reactivate') {
      return jsonResponse({ error: 'action doit être suspend ou reactivate' }, 400)
    }
    if (!target_user_id) {
      return jsonResponse({ error: 'target_user_id requis' }, 400)
    }
    if (target_user_id === cp.id) {
      return jsonResponse({ error: 'Impossible de modifier votre propre statut' }, 400)
    }

    const { data: targetData } = await admin
      .from('users')
      .select('id, organization_id, is_active, first_name, last_name')
      .eq('id', target_user_id)
      .single()

    if (!targetData) return jsonResponse({ error: 'Utilisateur introuvable' }, 404)
    const target = targetData as { id: string; organization_id: string; is_active: boolean; first_name: string; last_name: string }

    if (target.organization_id !== cp.organization_id) {
      return jsonResponse({ error: 'Cet utilisateur n\'est pas dans votre cabinet' }, 403)
    }

    const newIsActive = action === 'reactivate'

    // Anti-bricking : on refuse de suspendre le dernier admin actif
    if (action === 'suspend' && target.is_active) {
      const targetIsAdmin = await hasCabinetPerm(admin, target.id, 'can_manage_roles')
      if (targetIsAdmin) {
        // Compter les autres détenteurs actifs de can_manage_roles dans le cabinet
        const { data: rows } = await admin
          .from('user_platform_roles')
          .select('user_id, platform_roles!inner(organization_id, permissions), users!inner(is_active)')
          .eq('platform_roles.organization_id', cp.organization_id)
          .eq('users.is_active', true)
          .neq('user_id', target.id)
          .limit(100)

        const stillAdmins = (rows ?? []).some((row: unknown) => {
          const r = row as { platform_roles: { permissions: Record<string, boolean> } }
          return r.platform_roles?.permissions?.can_manage_roles === true
        })

        if (!stillAdmins) {
          return jsonResponse({
            error: 'Impossible: cet utilisateur est le dernier détenteur actif de can_manage_roles. Promouvez un autre membre d\'abord.',
          }, 409)
        }
      }
    }

    // deno-lint-ignore no-explicit-any
    const { error: updateError } = await (admin.from('users') as any)
      .update({ is_active: newIsActive })
      .eq('id', target.id)

    if (updateError) {
      console.error('[manage-member] update error:', updateError.message)
      return jsonResponse({ error: 'Mise à jour impossible' }, 500)
    }

    // Audit log
    // deno-lint-ignore no-explicit-any
    await (admin.from('member_audit_logs') as any).insert({
      organization_id: cp.organization_id,
      target_user_id: target.id,
      performed_by: cp.id,
      action: newIsActive ? 'reactivated' : 'deactivated',
    })

    return jsonResponse({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[manage-member] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
