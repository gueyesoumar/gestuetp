import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'
import { sendEmail } from '../_shared/resend.ts'
import { passwordResetTemplate } from '../_shared/email-templates/auth.ts'

/**
 * Edge Function : admin-user
 *
 * Actions super-admin sur un utilisateur:
 *  - reset_password : appelle supabaseAdmin.auth.admin.generateLink({type:'recovery'})
 *                     qui envoie un email de récupération via Supabase Auth.
 *                     Ne génère pas de mot de passe en clair.
 *  - change_role    : modifie l'attribution dans user_platform_roles. Le nouveau rôle
 *                     prend effet à la prochaine reconnexion (ou refresh JWT).
 *  - toggle_active  : passe is_active true/false sur public.users (suspendre/réactiver
 *                     un compte sans suspendre tout le cabinet).
 *
 * Le flag is_platform_owner est volontairement immuable depuis cette function —
 * il ne peut être modifié que via SQL Editor (sécurité critique).
 */

interface ResetBody { action: 'reset_password'; user_id: string; reason: string }
interface RoleBody { action: 'change_role'; user_id: string; new_role_id: string; reason: string }
interface ActiveBody { action: 'toggle_active'; user_id: string; reason: string }
type Body = ResetBody | RoleBody | ActiveBody

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as Body
    if (!body.user_id || !body.action || !body.reason?.trim()) {
      return jsonResponse({ error: 'user_id, action et reason requis' }, 400)
    }

    const { data: target, error: loadError } = await admin
      .from('users')
      .select('id, auth_id, email, first_name, last_name, is_active, organization_id, is_platform_owner')
      .eq('id', body.user_id)
      .single()

    if (loadError || !target) {
      return jsonResponse({ error: 'Utilisateur introuvable' }, 404)
    }
    const u = target as { id: string; auth_id: string; email: string; first_name: string; last_name: string; is_active: boolean; organization_id: string; is_platform_owner: boolean }

    if (body.action === 'reset_password') {
      const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.gestugroup.com'
      // deno-lint-ignore no-explicit-any
      const { data: linkData, error: linkError } = await (admin.auth.admin.generateLink as any)({
        type: 'recovery',
        email: u.email,
        options: { redirectTo: `${siteUrl}/set-password` },
      })
      const link = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link ?? null
      if (linkError || !link) {
        console.error('[admin-user] reset_password generateLink error:', linkError?.message ?? 'no link returned')
        return jsonResponse({ error: 'Génération du lien de réinitialisation impossible' }, 500)
      }

      const result = await sendEmail({
        to: u.email,
        subject: 'Réinitialisation de votre mot de passe — Gëstu Comply',
        html: passwordResetTemplate({ firstName: u.first_name || u.email, link }),
      })
      if (result.error) {
        console.error('[admin-user] reset_password sendEmail error:', result.error)
        return jsonResponse({ error: 'Envoi de l\'email impossible' }, 500)
      }

      await logAdminAction(admin, owner.id, 'reset_user_password', 'user', u.id, body.reason, {
        email: u.email,
        resend_id: result.id ?? null,
      })
      return jsonResponse({ success: true })
    }

    if (body.action === 'change_role') {
      if (!('new_role_id' in body) || !body.new_role_id) {
        return jsonResponse({ error: 'new_role_id requis' }, 400)
      }
      // Vérifier que le rôle appartient bien à l'organisation de l'utilisateur
      const { data: role } = await admin
        .from('platform_roles')
        .select('id, name, organization_id')
        .eq('id', body.new_role_id)
        .single()

      if (!role) return jsonResponse({ error: 'Rôle introuvable' }, 404)
      const r = role as { id: string; name: string; organization_id: string }
      if (r.organization_id !== u.organization_id) {
        return jsonResponse({ error: 'Le rôle n\'appartient pas à l\'organisation de l\'utilisateur' }, 400)
      }

      // Récupérer l'ancien rôle pour metadata
      const { data: previousAssignments } = await admin
        .from('user_platform_roles')
        .select('id, platform_role_id, platform_roles(name)')
        .eq('user_id', u.id)
      const previous = (previousAssignments ?? []) as Array<{ id: string; platform_role_id: string; platform_roles: { name: string } | null }>

      // Supprimer les anciennes assignations puis insérer la nouvelle (rôle unique côté UI)
      // deno-lint-ignore no-explicit-any
      await (admin.from('user_platform_roles') as any).delete().eq('user_id', u.id)
      // deno-lint-ignore no-explicit-any
      const { error: insertError } = await (admin.from('user_platform_roles') as any).insert({
        user_id: u.id,
        platform_role_id: r.id,
        assigned_by: owner.id,
      })
      if (insertError) {
        console.error('[admin-user] change_role error:', insertError.message)
        return jsonResponse({ error: 'Changement de rôle impossible' }, 500)
      }

      await logAdminAction(admin, owner.id, 'change_user_role', 'user', u.id, body.reason, {
        email: u.email,
        previous_roles: previous.map((p) => p.platform_roles?.name ?? p.platform_role_id),
        new_role: r.name,
      })
      return jsonResponse({ success: true })
    }

    if (body.action === 'toggle_active') {
      // Garde-fou : on ne peut pas désactiver un platform_owner via cette fonction
      if (u.is_platform_owner) {
        return jsonResponse({ error: 'Désactivation d\'un platform owner refusée. Retirez d\'abord le flag is_platform_owner via SQL.' }, 403)
      }
      const next = !u.is_active
      // deno-lint-ignore no-explicit-any
      const { error } = await (admin.from('users') as any)
        .update({ is_active: next, updated_at: new Date().toISOString() })
        .eq('id', u.id)
      if (error) {
        console.error('[admin-user] toggle_active error:', error.message)
        return jsonResponse({ error: 'Mise à jour du statut impossible' }, 500)
      }
      await logAdminAction(admin, owner.id, next ? 'activate_user' : 'deactivate_user', 'user', u.id, body.reason, { email: u.email })
      return jsonResponse({ success: true, is_active: next })
    }

    return jsonResponse({ error: 'Action inconnue' }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-user] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
