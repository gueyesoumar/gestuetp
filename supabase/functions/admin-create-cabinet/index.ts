import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'
import { sendEmail } from '../_shared/resend.ts'
import { cabinetOwnerInviteTemplate } from '../_shared/email-templates/auth.ts'

/**
 * Edge Function : admin-create-cabinet
 *
 * Onboarding d'un nouveau cabinet par le super-admin.
 * En une seule transaction logique :
 *  1. Crée l'organisation (type 'cabinet', plan choisi, is_active true)
 *  2. Crée un rôle par défaut 'Associé' sur la nouvelle org (avec is_default=true)
 *  3. Crée le compte auth + le profil public.users de l'owner
 *  4. Attribue le rôle Associé à l'owner
 *  5. Envoie un lien de définition de mot de passe à l'owner (Supabase Auth recovery)
 *  6. Log dans admin_audit_log
 *
 * Si une étape échoue, on rollback les étapes précédentes.
 */

interface Body {
  name: string
  slug: string
  plan_slug: string
  owner_email: string
  owner_first_name: string
  owner_last_name: string
  reason: string
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as Body
    if (!body.name?.trim() || !body.slug?.trim() || !body.plan_slug || !body.owner_email?.trim() ||
        !body.owner_first_name?.trim() || !body.owner_last_name?.trim() || !body.reason?.trim()) {
      return jsonResponse({ error: 'Tous les champs sont requis (name, slug, plan_slug, owner_email, owner_first_name, owner_last_name, reason)' }, 400)
    }

    if (!SLUG_RE.test(body.slug)) {
      return jsonResponse({ error: 'Slug invalide (3-50 caractères : a-z, 0-9, tirets ; pas de tiret de début/fin)' }, 400)
    }

    // 1. Vérifier que le slug est libre
    const { data: existingSlug } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', body.slug)
      .maybeSingle()
    if (existingSlug) {
      return jsonResponse({ error: 'Ce slug est déjà utilisé' }, 409)
    }

    // 2. Vérifier que le plan existe
    const { data: plan } = await admin
      .from('plans')
      .select('id, slug')
      .eq('slug', body.plan_slug)
      .single()
    if (!plan) {
      return jsonResponse({ error: 'Plan introuvable' }, 404)
    }
    const p = plan as { id: string; slug: string }

    // 3. Créer l'organisation
    // deno-lint-ignore no-explicit-any
    const { data: org, error: orgError } = await (admin.from('organizations') as any)
      .insert({
        name: body.name.trim(),
        slug: body.slug.trim(),
        types: ['cabinet'],
        is_active: true,
        plan_id: p.id,
      })
      .select('id')
      .single()
    if (orgError || !org) {
      console.error('[admin-create-cabinet] org error:', orgError?.message)
      return jsonResponse({ error: 'Création de l\'organisation impossible' }, 500)
    }
    const orgId = (org as { id: string }).id

    // 4. Créer le rôle par défaut 'Associé'
    // deno-lint-ignore no-explicit-any
    const { data: role, error: roleError } = await (admin.from('platform_roles') as any)
      .insert({
        organization_id: orgId,
        name: 'Associé',
        description: 'Rôle créé automatiquement à l\'onboarding. Peut tout faire dans le cabinet.',
        is_default: true,
        permissions: {
          can_create_mission: true, can_assign_team: true, can_be_lead: true, can_designate_lead: true,
          can_delete_mission: true, can_manage_members: true, can_manage_clients: true,
          can_edit_organization: true, can_manage_roles: true,
        },
      })
      .select('id')
      .single()
    if (roleError || !role) {
      console.error('[admin-create-cabinet] role error:', roleError?.message)
      // Rollback org
      // deno-lint-ignore no-explicit-any
      await (admin.from('organizations') as any).delete().eq('id', orgId)
      return jsonResponse({ error: 'Création du rôle par défaut impossible' }, 500)
    }
    const roleId = (role as { id: string }).id

    // 5. Créer le compte auth + le profil public.users de l'owner
    const { data: authResult, error: createUserError } = await admin.auth.admin.createUser({
      email: body.owner_email.trim().toLowerCase(),
      email_confirm: true,
      user_metadata: { first_name: body.owner_first_name.trim(), last_name: body.owner_last_name.trim() },
    })

    if (createUserError || !authResult?.user) {
      console.error('[admin-create-cabinet] auth error:', createUserError?.message)
      const message = createUserError?.message.includes('already been registered')
        ? 'Cet email est déjà utilisé'
        : 'Création du compte owner impossible'
      // Rollback : supprimer org + role
      // deno-lint-ignore no-explicit-any
      await (admin.from('organizations') as any).delete().eq('id', orgId)
      return jsonResponse({ error: message }, 400)
    }
    const authId = authResult.user.id

    // 6. Insérer le profil public.users
    // deno-lint-ignore no-explicit-any
    const { data: profile, error: profileError } = await (admin.from('users') as any)
      .insert({
        auth_id: authId,
        organization_id: orgId,
        email: body.owner_email.trim().toLowerCase(),
        first_name: body.owner_first_name.trim(),
        last_name: body.owner_last_name.trim(),
        is_active: true,
      })
      .select('id')
      .single()
    if (profileError || !profile) {
      console.error('[admin-create-cabinet] profile error:', profileError?.message)
      // Rollback total
      await admin.auth.admin.deleteUser(authId)
      // deno-lint-ignore no-explicit-any
      await (admin.from('organizations') as any).delete().eq('id', orgId)
      return jsonResponse({ error: 'Création du profil owner impossible' }, 500)
    }
    const ownerProfileId = (profile as { id: string }).id

    // 7. Attribuer le rôle Associé
    // deno-lint-ignore no-explicit-any
    await (admin.from('user_platform_roles') as any).insert({
      user_id: ownerProfileId,
      platform_role_id: roleId,
      assigned_by: owner.id,
    })

    // 8. Générer le lien de définition de mot de passe et l'envoyer via Resend
    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.gestugroup.com'
    let invitationSent = false
    // deno-lint-ignore no-explicit-any
    const { data: linkData, error: linkError } = await (admin.auth.admin.generateLink as any)({
      type: 'recovery',
      email: body.owner_email.trim().toLowerCase(),
      options: { redirectTo: `${siteUrl}/set-password` },
    })
    const link = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link ?? null
    if (linkError || !link) {
      console.warn('[admin-create-cabinet] generateLink warning:', linkError?.message ?? 'no link returned')
    } else {
      const sendResult = await sendEmail({
        to: body.owner_email.trim().toLowerCase(),
        subject: `Bienvenue sur Gëstu Comply — ${body.name}`,
        html: cabinetOwnerInviteTemplate({
          firstName: body.owner_first_name.trim(),
          cabinetName: body.name,
          link,
        }),
      })
      if (sendResult.error) {
        console.warn('[admin-create-cabinet] sendEmail warning:', sendResult.error)
      } else {
        invitationSent = true
      }
    }

    // 9. Audit log
    await logAdminAction(admin, owner.id, 'create_cabinet', 'organization', orgId, body.reason, {
      name: body.name,
      slug: body.slug,
      plan_slug: p.slug,
      owner_email: body.owner_email,
      owner_user_id: ownerProfileId,
    })

    return jsonResponse({
      success: true,
      cabinet_id: orgId,
      owner_user_id: ownerProfileId,
      invitation_sent: invitationSent,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-create-cabinet] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
