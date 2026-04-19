import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/resend.ts'
import { clientInviteTemplate } from '../_shared/email-templates.ts'

interface InvitePayload {
  cabinet_client_id: string
  contact_name: string
  email: string
  phone?: string
  job_title?: string
  mission_id: string
  permission: 'contributor' | 'viewer'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Vérifier l'appelant
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callerProfile } = await admin
      .from('users')
      .select('id, organization_id')
      .eq('auth_id', caller.id)
      .single()

    if (!callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: InvitePayload = await req.json()
    const { cabinet_client_id, contact_name, email, phone, job_title, mission_id, permission } = body

    if (!cabinet_client_id || !contact_name || !email || !mission_id) {
      return new Response(
        JSON.stringify({ error: 'Champs requis : cabinet_client_id, contact_name, email, mission_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier que le cabinet_client appartient à l'organisation de l'appelant
    const { data: cabinetClient } = await admin
      .from('cabinet_clients')
      .select('id, cabinet_id')
      .eq('id', cabinet_client_id)
      .single()

    if (!cabinetClient || cabinetClient.cabinet_id !== callerProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Client non trouvé dans votre organisation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vérifier que la mission appartient au cabinet
    const { data: mission } = await admin
      .from('missions')
      .select('id, cabinet_id')
      .eq('id', mission_id)
      .single()

    if (!mission || mission.cabinet_id !== callerProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Mission non trouvée dans votre organisation' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Chercher si le contact existe déjà dans client_portal_contacts
    const { data: existingContacts } = await admin
      .from('client_portal_contacts')
      .select('id, user_id, portal_status')
      .eq('cabinet_client_id', cabinet_client_id)
      .eq('email', email)
      .limit(1)

    let contactId: string
    let userId: string | null = null
    let isNewUser = false
    let inviteLink: string | null = null

    if (existingContacts && existingContacts.length > 0) {
      // Contact existe déjà
      contactId = existingContacts[0].id
      userId = existingContacts[0].user_id

      if (!userId) {
        // Contact existe mais pas encore de compte Auth — le créer
        isNewUser = true
      }
    } else {
      // Créer le contact
      const { data: newContact, error: contactError } = await admin
        .from('client_portal_contacts')
        .insert({
          cabinet_client_id,
          contact_name,
          email,
          phone: phone ?? null,
          job_title: job_title ?? null,
          portal_status: 'pending',
        })
        .select('id')
        .single()

      if (contactError || !newContact) {
        console.error('[invite-client] create contact:', contactError?.message)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la création du contact' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      contactId = newContact.id
      isNewUser = true
    }

    // Créer le compte Auth si nécessaire
    if (isNewUser) {
      // Vérifier si un user Auth existe déjà avec cet email (multi-cabinet)
      const { data: existingAuthUsers } = await admin.auth.admin.listUsers()
      const existingAuth = existingAuthUsers?.users?.find(u => u.email === email)

      if (existingAuth) {
        // User Auth existe (autre cabinet). Chercher le profil users
        const { data: existingProfile } = await admin
          .from('users')
          .select('id')
          .eq('auth_id', existingAuth.id)
          .single()

        if (existingProfile) {
          userId = existingProfile.id
        }
      }

      if (!userId) {
        // Créer un nouveau user Auth avec un mot de passe temporaire
        const tempPassword = crypto.randomUUID()
        const { data: authUser, error: createError } = await admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: contact_name, is_client: true },
        })

        if (createError) {
          console.error('[invite-client] createUser:', createError.message)
          return new Response(
            JSON.stringify({ error: createError.message.includes('already been registered') ? 'Cet email est déjà utilisé' : 'Erreur lors de la création du compte' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Créer le profil dans public.users
        const nameParts = contact_name.trim().split(/\s+/)
        const firstName = nameParts[0] ?? contact_name
        const lastName = nameParts.slice(1).join(' ') || '-'

        const { data: newUser, error: userError } = await admin
          .from('users')
          .insert({
            auth_id: authUser.user.id,
            organization_id: callerProfile.organization_id,
            email,
            first_name: firstName,
            last_name: lastName,
            phone: phone ?? null,
            job_title: job_title ?? null,
            role: 'client',
            client_org_id: cabinet_client_id,
          })
          .select('id')
          .single()

        if (userError || !newUser) {
          console.error('[invite-client] insert user:', userError?.message)
          await admin.auth.admin.deleteUser(authUser.user.id)
          return new Response(
            JSON.stringify({ error: 'Erreur lors de la création du profil' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        userId = newUser.id

        // Générer le lien de récupération pour que le client définisse son mot de passe
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: {
            redirectTo: `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/set-password`,
          },
        })
        inviteLink = linkData?.properties?.action_link ?? null
      }

      // Lier le user_id au contact et passer en status invited
      await admin
        .from('client_portal_contacts')
        .update({
          user_id: userId,
          portal_status: 'invited',
          invited_at: new Date().toISOString(),
        })
        .eq('id', contactId)
    }

    // Créer l'accès mission (upsert pour éviter les doublons)
    const { error: accessError } = await admin
      .from('client_mission_access')
      .upsert({
        contact_id: contactId,
        mission_id,
        permission: permission ?? 'contributor',
        granted_by: callerProfile.id,
      }, { onConflict: 'contact_id,mission_id' })

    if (accessError) {
      console.error('[invite-client] upsert access:', accessError.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'attribution de l\'accès' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Toujours envoyer un email (même si le user existe déjà)
    if (!inviteLink && userId) {
      // Générer un lien de récupération pour l'utilisateur existant
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${Deno.env.get('SITE_URL') ?? 'http://localhost:5173'}/set-password`,
        },
      })
      inviteLink = linkData?.properties?.action_link ?? null
    }

    if (inviteLink) {
      const { data: missionData } = await admin.from('missions').select('name').eq('id', mission_id).single()
      const { data: cabinetData } = await admin.from('organizations').select('name').eq('id', callerProfile.organization_id).single()

      const emailResult = await sendEmail({
        to: email,
        subject: `Invitation au portail client — ${(missionData?.name as string) ?? 'Mission d\'audit'}`,
        html: clientInviteTemplate({
          contactName: contact_name,
          cabinetName: (cabinetData?.name as string) ?? 'Cabinet d\'audit',
          missionTitle: (missionData?.name as string) ?? 'Mission d\'audit',
          inviteLink,
        }),
      })

      if (emailResult.error) {
        console.error('[invite-client] email error:', emailResult.error)
      } else {
        console.log('[invite-client] email sent:', emailResult.id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contact_id: contactId,
        user_id: userId,
        is_new_user: isNewUser,
        invite_link: inviteLink,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[invite-client] unexpected:', message)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
