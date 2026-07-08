import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/resend.ts'
import { clientInviteTemplate } from '../_shared/email-templates.ts'
import { buildEmailFrom, loadCabinetEmailBranding } from '../_shared/email-branding.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

// Provisioning d'un contact assujetti (Gëstu Regul / M7). Dérivée d'invite-client
// mais sur le chemin entity_org_id : l'assujetti est une organisation (entité)
// rattachée au régulateur, PAS un cabinet_client. Le contact voit ensuite sa
// mission de contrôle via le portail cloisonné (moteur cp_* partagé).

interface InvitePayload {
  assujetti_org_id: string
  contact_name: string
  email: string
  phone?: string
  job_title?: string
  mission_id: string
  permission?: 'contributor' | 'viewer' | 'approver'
}

const GROUP_PERM_KEYS = [
  'can_view_supervision',
  'can_create_campaign',
  'can_manage_subsidiaries',
  'can_view_entity_detail',
]

// Réplique canManageEntities de manage-entity : owner OU perm groupe explicite OU
// aucune permission groupe configurée (premier setup). Fail-closed sinon.
// deno-lint-ignore no-explicit-any
async function canManageEntities(admin: any, userId: string): Promise<boolean> {
  if (await hasCabinetPerm(admin, userId, 'can_manage_subsidiaries')) return true
  const { data } = await admin
    .from('user_platform_roles')
    .select('platform_roles(permissions)')
    .eq('user_id', userId)
  const rows = (data ?? []) as Array<{ platform_roles: { permissions: Record<string, unknown> } | null }>
  const anyGroupPerm = rows.some((r) => {
    const p = r.platform_roles?.permissions
    return !!p && GROUP_PERM_KEYS.some((k) => k in p)
  })
  return !anyGroupPerm
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status: number): Response =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const auth = await authenticateCaller(admin, req)
    if (!auth.ok) return json({ error: auth.message }, auth.status)
    const caller = auth.profile
    if (caller.role === 'client') return json({ error: 'Accès refusé' }, 403)

    if (!(await canManageEntities(admin, caller.id))) {
      return json({ error: 'Permission de gestion des assujettis requise' }, 403)
    }

    const body = (await req.json()) as InvitePayload
    const { assujetti_org_id, contact_name, email, phone, job_title, mission_id } = body
    const permission = body.permission ?? 'viewer'

    if (!assujetti_org_id || !contact_name || !email || !mission_id) {
      return json({ error: 'Champs requis : assujetti_org_id, contact_name, email, mission_id' }, 400)
    }

    // Garde sous-arbre : l'assujetti doit appartenir au parc du régulateur appelant.
    const { data: descRows } = await admin.rpc('get_subsidiary_ids', { parent_id: caller.organization_id })
    const descendants = new Set<string>(
      ((descRows ?? []) as Array<string | { get_subsidiary_ids?: string; id?: string }>)
        .map((r) => (typeof r === 'string' ? r : (r.get_subsidiary_ids ?? r.id ?? '')))
        .filter(Boolean),
    )
    if (!descendants.has(assujetti_org_id)) {
      return json({ error: 'Assujetti hors de votre parc' }, 403)
    }

    // La mission doit appartenir au régulateur ET cibler cet assujetti.
    const { data: mission } = await admin
      .from('missions')
      .select('id, cabinet_id, client_id, name')
      .eq('id', mission_id)
      .single()
    if (!mission || mission.cabinet_id !== caller.organization_id || mission.client_id !== assujetti_org_id) {
      return json({ error: 'Mission invalide pour cet assujetti' }, 403)
    }

    // Contact existant ? (chemin entity_org_id)
    const { data: existingContacts } = await admin
      .from('client_portal_contacts')
      .select('id, user_id')
      .eq('entity_org_id', assujetti_org_id)
      .eq('email', email)
      .limit(1)

    let contactId: string
    let userId: string | null = null
    let isNewUser = false
    let inviteLink: string | null = null

    if (existingContacts && existingContacts.length > 0) {
      contactId = existingContacts[0].id
      userId = existingContacts[0].user_id
      if (!userId) isNewUser = true
    } else {
      const { data: newContact, error: contactError } = await admin
        .from('client_portal_contacts')
        .insert({
          entity_org_id: assujetti_org_id,
          contact_name,
          email,
          phone: phone ?? null,
          job_title: job_title ?? null,
          portal_status: 'pending',
        })
        .select('id')
        .single()
      if (contactError || !newContact) {
        console.error('[invite-assujetti] create contact:', contactError?.message)
        return json({ error: 'Erreur lors de la création du contact' }, 500)
      }
      contactId = newContact.id
      isNewUser = true
    }

    if (isNewUser) {
      // Compte Auth existant (même email) ?
      const { data: existingAuthUsers } = await admin.auth.admin.listUsers()
      const existingAuth = existingAuthUsers?.users?.find((u) => u.email === email)
      if (existingAuth) {
        const { data: existingProfile } = await admin
          .from('users').select('id').eq('auth_id', existingAuth.id).single()
        if (existingProfile) userId = existingProfile.id
      }

      if (!userId) {
        const tempPassword = crypto.randomUUID()
        const { data: authUser, error: createError } = await admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: contact_name, is_client: true },
        })
        if (createError) {
          console.error('[invite-assujetti] createUser:', createError.message)
          return json({ error: createError.message.includes('already been registered') ? 'Cet email est déjà utilisé' : 'Erreur lors de la création du compte' }, 400)
        }

        const nameParts = contact_name.trim().split(/\s+/)
        const firstName = nameParts[0] ?? contact_name
        const lastName = nameParts.slice(1).join(' ') || '-'

        // client_org_id reste NULL : FK -> cabinet_clients, inapplicable à un assujetti.
        const { data: newUser, error: userError } = await admin
          .from('users')
          .insert({
            auth_id: authUser.user.id,
            organization_id: assujetti_org_id,
            email,
            first_name: firstName,
            last_name: lastName,
            phone: phone ?? null,
            job_title: job_title ?? null,
            role: 'client',
          })
          .select('id')
          .single()
        if (userError || !newUser) {
          console.error('[invite-assujetti] insert user:', userError?.message)
          await admin.auth.admin.deleteUser(authUser.user.id)
          return json({ error: 'Erreur lors de la création du profil' }, 500)
        }
        userId = newUser.id

        const { data: linkData } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo: `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/set-password` },
        })
        inviteLink = linkData?.properties?.action_link ?? null
      }

      await admin
        .from('client_portal_contacts')
        .update({ user_id: userId, portal_status: 'invited', invited_at: new Date().toISOString() })
        .eq('id', contactId)
    }

    // Accès mission (upsert)
    const { error: accessError } = await admin
      .from('client_mission_access')
      .upsert({ contact_id: contactId, mission_id, permission, granted_by: caller.id }, { onConflict: 'contact_id,mission_id' })
    if (accessError) {
      console.error('[invite-assujetti] upsert access:', accessError.message)
      return json({ error: "Erreur lors de l'attribution de l'accès" }, 500)
    }

    // Email (lien recovery pour définir le mot de passe)
    if (!inviteLink && userId) {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/set-password` },
      })
      inviteLink = linkData?.properties?.action_link ?? null
    }

    if (inviteLink) {
      const { data: regulatorData } = await admin.from('organizations').select('name').eq('id', caller.organization_id).single()
      const branding = await loadCabinetEmailBranding(admin, caller.organization_id)
      const regulatorName = (regulatorData?.name as string) ?? 'Autorité de régulation'

      const emailResult = await sendEmail({
        to: email,
        subject: `Invitation au portail — ${mission.name}`,
        html: clientInviteTemplate({
          contactName: contact_name,
          cabinetName: regulatorName,
          missionTitle: (mission.name as string) ?? 'Mission de contrôle',
          inviteLink,
          branding,
        }),
        from: buildEmailFrom(branding),
        replyTo: branding?.supportEmail ?? undefined,
      })
      if (emailResult.error) console.error('[invite-assujetti] email error:', emailResult.error)
    }

    return json({ success: true, contact_id: contactId, user_id: userId, is_new_user: isNewUser, invite_link: inviteLink }, 201)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[invite-assujetti] unexpected:', message)
    return json({ error: 'Erreur interne' }, 500)
  }
})
