import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logActivity } from '../_shared/audit-log.ts'
import { sendEmail } from '../_shared/resend.ts'
import { clientInviteTemplate } from '../_shared/email-templates.ts'
import { buildEmailFrom, loadCabinetEmailBranding } from '../_shared/email-branding.ts'
import { resolveCabinetSiteUrl } from '../_shared/cabinet-site-url.ts'
import { createSetupToken, buildSetupLink } from '../_shared/setup-token.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

// Gëstu Vendor (RFC 0020 Lot 3a) : invitation d'un CANDIDAT (societe fournisseur) au
// portail pour auto-evaluation. Derive d'invite-assujetti : le candidat est un
// utilisateur portail (role=client) rattache au NOEUD org fournisseur (target de
// l'arete 'supplier'). Pas de client_mission_access : l'acces passe par
// get_my_portal_org_ids() -> edge fournisseur -> vendor_assessment (voie disjointe).

interface Payload {
  relationship_id: string
  contact_name: string
  email: string
  phone?: string
  job_title?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, s: number): Response =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const auth = await authenticateCaller(admin, req)
    if (!auth.ok) return json({ error: auth.message }, auth.status)
    const caller = auth.profile
    if (caller.role === 'client') return json({ error: 'Accès refusé' }, 403)
    if (!(await hasCabinetPerm(admin, caller.id, 'can_manage_vendors'))) {
      return json({ error: 'Permission can_manage_vendors requise' }, 403)
    }

    const body = await req.json() as Payload
    const name = (body.contact_name ?? '').trim()
    const email = (body.email ?? '').trim().toLowerCase()
    if (!body.relationship_id || !name || !email) return json({ error: 'relationship_id, contact_name et email requis' }, 400)

    // L'arete fournisseur doit appartenir au gestionnaire appelant -> org fournisseur.
    const { data: edge } = await admin.from('organization_relationships')
      .select('target_org_id, actor_org_id, nature').eq('id', body.relationship_id).single()
    if (!edge || edge.nature !== 'supplier' || edge.actor_org_id !== caller.organization_id) {
      return json({ error: 'Fournisseur introuvable dans votre périmètre' }, 403)
    }
    const vendorOrgId = edge.target_org_id as string

    // Contact existant ? (chemin client_org_id = org fournisseur)
    const { data: existing } = await admin.from('client_portal_contacts')
      .select('id, user_id').eq('client_org_id', vendorOrgId).eq('email', email).limit(1)
    let contactId: string
    let userId: string | null = null
    let isNew = false
    if (existing && existing.length > 0) {
      contactId = existing[0].id; userId = existing[0].user_id; if (!userId) isNew = true
    } else {
      const { data: c, error: cErr } = await admin.from('client_portal_contacts')
        .insert({ client_org_id: vendorOrgId, contact_name: name, email, phone: body.phone ?? null, job_title: body.job_title ?? null, portal_status: 'pending' })
        .select('id').single()
      if (cErr || !c) { console.error('[invite-vendor-candidate] contact:', cErr?.message); return json({ error: 'Création du contact impossible' }, 500) }
      contactId = c.id; isNew = true
    }

    let inviteLink: string | null = null
    if (isNew) {
      const { data: authUsers } = await admin.auth.admin.listUsers()
      const existingAuth = authUsers?.users?.find((u) => u.email === email)
      if (existingAuth) {
        const { data: prof } = await admin.from('users').select('id').eq('auth_id', existingAuth.id).single()
        if (prof) userId = prof.id
      }
      if (!userId) {
        const { data: au, error: aErr } = await admin.auth.admin.createUser({
          email, password: crypto.randomUUID(), email_confirm: true,
          user_metadata: { full_name: name, is_client: true },
        })
        if (aErr || !au?.user) { console.error('[invite-vendor-candidate] auth:', aErr?.message); return json({ error: 'Impossible de créer un compte avec cette adresse email.' }, 400) }
        const parts = name.split(/\s+/)
        const { data: nu, error: uErr } = await admin.from('users').insert({
          auth_id: au.user.id, organization_id: vendorOrgId, email,
          first_name: parts[0] ?? name, last_name: parts.slice(1).join(' ') || '-',
          phone: body.phone ?? null, job_title: body.job_title ?? null, role: 'client',
        }).select('id').single()
        if (uErr || !nu) { console.error('[invite-vendor-candidate] user:', uErr?.message); await admin.auth.admin.deleteUser(au.user.id); return json({ error: 'Création du profil impossible' }, 500) }
        userId = nu.id
      }
      await admin.from('client_portal_contacts').update({ user_id: userId, portal_status: 'invited', invited_at: new Date().toISOString() }).eq('id', contactId)
    }

    if (userId) {
      const siteUrl = await resolveCabinetSiteUrl(admin, caller.organization_id)
      const tokenRes = await createSetupToken(admin, { userId, purpose: 'invite', ttlHours: 24 })
      inviteLink = 'error' in tokenRes ? null : buildSetupLink(siteUrl, tokenRes.raw)
    }

    let emailSent = false
    if (inviteLink) {
      const { data: vendor } = await admin.from('organizations').select('name').eq('id', vendorOrgId).single()
      const { data: reg } = await admin.from('organizations').select('name').eq('id', caller.organization_id).single()
      const branding = await loadCabinetEmailBranding(admin, caller.organization_id)
      const r = await sendEmail({
        to: email,
        subject: `Invitation : évaluation sécurité (${(vendor?.name as string) ?? 'votre société'})`,
        html: clientInviteTemplate({
          contactName: name, cabinetName: (reg?.name as string) ?? 'Autorité de régulation',
          missionTitle: 'Auto-évaluation sécurité', inviteLink, branding,
        }),
        from: buildEmailFrom(branding), replyTo: branding?.supportEmail ?? undefined,
      })
      if (!r.error) emailSent = true
    }

    await logActivity(admin, {
      organizationId: caller.organization_id, actorUserId: caller.id,
      action: 'vendor.candidate_invited', targetType: 'portal_contact', targetId: contactId, targetLabel: name,
    })

    return json({ success: true, contact_id: contactId, user_id: userId, email_sent: emailSent }, 201)
  } catch (err) {
    console.error('[invite-vendor-candidate]', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
