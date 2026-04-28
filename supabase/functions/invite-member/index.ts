import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'
import { sendEmail } from '../_shared/resend.ts'
import { memberInviteTemplate } from '../_shared/email-templates/auth.ts'

/**
 * Edge Function : invite-member
 *
 * Deux modes :
 *   - Création (resend !== true) : crée un compte auth + profil + rôle, puis
 *     envoie un email d'invitation via Resend avec un lien de définition de
 *     mot de passe.
 *   - Renvoi (resend === true)   : ne crée rien, génère un nouveau lien
 *     recovery et le renvoie par email à l'utilisateur existant.
 *
 * Sécurité : appelant doit avoir can_manage_members dans le cabinet ciblé.
 */

interface InvitePayload {
  email: string
  first_name: string
  last_name: string
  role_id?: string
  organization_id: string
  resend?: boolean
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Non autorisé' }, 401)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return jsonResponse({ error: 'Non autorisé' }, 401)
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, organization_id')
      .eq('auth_id', caller.id)
      .single()

    if (profileError || !callerProfile) {
      return jsonResponse({ error: 'Profil introuvable' }, 403)
    }
    const cp = callerProfile as { id: string; organization_id: string }

    const body: InvitePayload = await req.json()
    const { email, first_name, last_name, role_id, organization_id, resend } = body

    if (!email || !first_name || !last_name || !organization_id) {
      return jsonResponse({ error: 'Champs requis manquants' }, 400)
    }
    if (!resend && !role_id) {
      return jsonResponse({ error: 'role_id requis pour une nouvelle invitation' }, 400)
    }

    if (cp.organization_id !== organization_id) {
      return jsonResponse({ error: 'Accès interdit à cette organisation' }, 403)
    }

    if (!(await hasCabinetPerm(supabaseAdmin, cp.id, 'can_manage_members'))) {
      return jsonResponse({ error: 'Permission can_manage_members requise' }, 403)
    }

    // Charger le nom du cabinet pour le template
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single()
    const cabinetName = (orgData as { name: string } | null)?.name ?? 'votre cabinet'

    const cleanEmail = email.trim().toLowerCase()
    const cleanFirstName = first_name.trim()
    const cleanLastName = last_name.trim()

    // ===========================================================
    // Branche A : RENVOI d'invitation (user existant)
    // ===========================================================
    if (resend === true) {
      const linkResult = await generateRecoveryLink(supabaseAdmin, cleanEmail)
      if (!linkResult.link) {
        console.error('[invite-member] resend generateLink failed:', linkResult.error)
        return jsonResponse({ error: 'Impossible de générer le lien d\'invitation' }, 500)
      }

      const sendResult = await sendEmail({
        to: cleanEmail,
        subject: `Invitation Gëstu Comply — ${cabinetName}`,
        html: memberInviteTemplate({
          firstName: cleanFirstName,
          cabinetName,
          link: linkResult.link,
          isResend: true,
        }),
      })
      if (sendResult.error) {
        console.error('[invite-member] resend sendEmail failed:', sendResult.error)
        return jsonResponse({ error: 'L\'email n\'a pas pu être envoyé' }, 500)
      }

      return jsonResponse({ success: true, resent: true })
    }

    // ===========================================================
    // Branche B : CRÉATION d'un nouveau membre
    // ===========================================================

    // Vérifier que le rôle existe dans l'organisation
    const { data: role, error: roleError } = await supabaseAdmin
      .from('platform_roles')
      .select('id')
      .eq('id', role_id!)
      .eq('organization_id', organization_id)
      .single()

    if (roleError || !role) {
      return jsonResponse({ error: 'Rôle invalide pour cette organisation' }, 400)
    }

    // Créer le compte auth
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      email_confirm: true,
      user_metadata: { first_name: cleanFirstName, last_name: cleanLastName },
    })

    if (createError || !authUser?.user) {
      const message = createError?.message.includes('already been registered')
        ? 'Cet email est déjà utilisé'
        : 'Erreur lors de la création du compte'
      console.error('[invite-member] createUser:', createError?.message)
      return jsonResponse({ error: message }, 400)
    }

    // Créer le profil public.users
    const { data: newUser, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authUser.user.id,
        organization_id,
        email: cleanEmail,
        first_name: cleanFirstName,
        last_name: cleanLastName,
      })
      .select('id')
      .single()

    if (userError || !newUser) {
      console.error('[invite-member] insert user:', userError?.message)
      // Rollback : supprimer le compte auth créé
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return jsonResponse({ error: 'Erreur lors de la création du profil' }, 500)
    }

    const newUserId = (newUser as { id: string }).id

    // Attribuer le rôle (best-effort, on continue si ça échoue)
    const { error: roleAssignError } = await supabaseAdmin
      .from('user_platform_roles')
      .insert({
        user_id: newUserId,
        platform_role_id: role_id!,
        assigned_by: cp.id,
      })

    if (roleAssignError) {
      console.error('[invite-member] assign role:', roleAssignError.message)
      // Le user est créé sans rôle — non bloquant, l'admin pourra le rattraper
    }

    // Générer le lien et envoyer l'email d'invitation
    let invitationSent = false
    const linkResult = await generateRecoveryLink(supabaseAdmin, cleanEmail)
    if (!linkResult.link) {
      console.warn('[invite-member] generateLink warning:', linkResult.error)
    } else {
      const sendResult = await sendEmail({
        to: cleanEmail,
        subject: `Invitation Gëstu Comply — ${cabinetName}`,
        html: memberInviteTemplate({
          firstName: cleanFirstName,
          cabinetName,
          link: linkResult.link,
        }),
      })
      if (sendResult.error) {
        console.warn('[invite-member] sendEmail warning:', sendResult.error)
      } else {
        invitationSent = true
      }
    }

    return jsonResponse({ success: true, user_id: newUserId, invitation_sent: invitationSent }, 201)
  } catch (err) {
    console.error('[invite-member] unexpected:', err)
    return jsonResponse({ error: 'Erreur interne' }, 500)
  }
})

// deno-lint-ignore no-explicit-any
async function generateRecoveryLink(admin: any, email: string): Promise<{ link: string | null; error: string | null }> {
  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://app.gestugroup.com'
  // deno-lint-ignore no-explicit-any
  const { data, error } = await (admin.auth.admin.generateLink as any)({
    type: 'recovery',
    email,
    options: { redirectTo: `${siteUrl}/set-password` },
  })
  const link = (data as { properties?: { action_link?: string } } | null)?.properties?.action_link ?? null
  return { link, error: error?.message ?? null }
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
