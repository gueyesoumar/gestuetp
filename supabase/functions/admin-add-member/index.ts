import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'
import { sendEmail } from '../_shared/resend.ts'
import { memberInviteTemplate } from '../_shared/email-templates/auth.ts'
import { resolveCabinetSiteUrl } from '../_shared/cabinet-site-url.ts'
import { buildSetPasswordLink, extractHashedToken } from '../_shared/auth-links.ts'
import { buildEmailFrom, loadCabinetEmailBranding } from '../_shared/email-branding.ts'

/**
 * Edge Function : admin-add-member
 *
 * Ajoute un membre à une organisation DÉJÀ EXISTANTE, par le super-admin.
 * Complète admin-create-cabinet (qui ne crée que le 1er owner à la création).
 * Par défaut, le membre reçoit le rôle « Associé » (toutes permissions cabinet)
 * — c.-à-d. un administrateur du cabinet. Si l'org n'a pas encore de rôle par
 * défaut, il est créé (identique à l'onboarding).
 *
 * 1. Vérifie l'org, résout/crée le rôle admin par défaut
 * 2. Crée le compte auth + le profil public.users dans l'org
 * 3. Attribue le rôle
 * 4. Envoie l'email brandé de définition de mot de passe (lien domaine cabinet)
 * 5. Journalise dans admin_audit_log
 */

interface Body {
  organization_id: string
  email: string
  first_name: string
  last_name: string
  reason: string
}

const ASSOCIATE_PERMISSIONS = {
  can_create_mission: true, can_assign_team: true, can_be_lead: true, can_designate_lead: true,
  can_delete_mission: true, can_manage_members: true, can_manage_clients: true,
  can_edit_organization: true, can_manage_roles: true, can_view_audit_trail: true,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as Body
    const email = body.email?.trim().toLowerCase()
    const firstName = body.first_name?.trim()
    const lastName = body.last_name?.trim()
    if (!body.organization_id || !email || !firstName || !lastName || !body.reason?.trim()) {
      return jsonResponse({ error: 'organization_id, email, first_name, last_name et reason requis' }, 400)
    }

    // 1. Vérifier l'organisation
    const { data: org } = await admin
      .from('organizations')
      .select('id, name')
      .eq('id', body.organization_id)
      .maybeSingle()
    if (!org) return jsonResponse({ error: 'Organisation introuvable' }, 404)
    const orgId = (org as { id: string; name: string }).id
    const orgName = (org as { name: string }).name

    // 2. Résoudre le rôle admin par défaut (le créer si l'org n'en a pas)
    let roleId: string | null = null
    const { data: defaultRole } = await admin
      .from('platform_roles')
      .select('id')
      .eq('organization_id', orgId)
      .eq('is_default', true)
      .maybeSingle()
    if (defaultRole) {
      roleId = (defaultRole as { id: string }).id
    } else {
      // deno-lint-ignore no-explicit-any
      const { data: newRole, error: roleError } = await (admin.from('platform_roles') as any)
        .insert({
          organization_id: orgId,
          name: 'Associé',
          description: 'Rôle administrateur créé automatiquement. Peut tout faire dans le cabinet.',
          is_default: true,
          permissions: ASSOCIATE_PERMISSIONS,
        })
        .select('id')
        .single()
      if (roleError || !newRole) {
        console.error('[admin-add-member] role:', roleError?.message)
        return jsonResponse({ error: 'Création du rôle par défaut impossible' }, 500)
      }
      roleId = (newRole as { id: string }).id
    }

    // 3. Créer le compte auth
    const { data: authResult, error: createUserError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    })
    if (createUserError || !authResult?.user) {
      const message = createUserError?.message.includes('already been registered')
        ? 'Cet email est déjà utilisé'
        : 'Création du compte impossible'
      console.error('[admin-add-member] auth:', createUserError?.message)
      return jsonResponse({ error: message }, 400)
    }
    const authId = authResult.user.id

    // 4. Insérer le profil public.users
    // deno-lint-ignore no-explicit-any
    const { data: profile, error: profileError } = await (admin.from('users') as any)
      .insert({ auth_id: authId, organization_id: orgId, email, first_name: firstName, last_name: lastName, is_active: true })
      .select('id')
      .single()
    if (profileError || !profile) {
      console.error('[admin-add-member] profile:', profileError?.message)
      await admin.auth.admin.deleteUser(authId)
      const isDup = profileError?.code === '23505'
      return jsonResponse({ error: isDup ? 'Cet utilisateur existe déjà dans l\'organisation' : 'Création du profil impossible' }, isDup ? 409 : 500)
    }
    const newUserId = (profile as { id: string }).id

    // 5. Attribuer le rôle
    // deno-lint-ignore no-explicit-any
    await (admin.from('user_platform_roles') as any).insert({
      user_id: newUserId,
      platform_role_id: roleId,
      assigned_by: owner.id,
    })

    // 6. Email brandé de définition de mot de passe (lien domaine cabinet via token_hash)
    const siteUrl = await resolveCabinetSiteUrl(admin, orgId)
    let invitationSent = false
    // deno-lint-ignore no-explicit-any
    const { data: linkData, error: linkError } = await (admin.auth.admin.generateLink as any)({
      type: 'recovery',
      email,
      options: { redirectTo: `${siteUrl}/set-password` },
    })
    const hashedToken = extractHashedToken(linkData)
    const link = hashedToken ? buildSetPasswordLink(siteUrl, hashedToken) : null
    if (linkError || !link) {
      console.warn('[admin-add-member] generateLink:', linkError?.message ?? 'no token')
    } else {
      const branding = await loadCabinetEmailBranding(admin, orgId)
      const sendResult = await sendEmail({
        to: email,
        subject: `Invitation ${branding?.cabinetName ?? orgName} — ${orgName}`,
        html: memberInviteTemplate({ firstName, cabinetName: orgName, link, branding }),
        from: buildEmailFrom(branding),
        replyTo: branding?.supportEmail ?? undefined,
      })
      if (sendResult.error) console.warn('[admin-add-member] sendEmail:', sendResult.error)
      else invitationSent = true
    }

    // 7. Audit
    await logAdminAction(admin, owner.id, 'add_member', 'user', newUserId, body.reason, {
      email, organization_id: orgId, organization_name: orgName,
    })

    return jsonResponse({ success: true, user_id: newUserId, invitation_sent: invitationSent })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-add-member]', message)
    return jsonResponse({ error: 'Erreur interne' }, 500)
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
