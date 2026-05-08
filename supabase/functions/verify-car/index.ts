// Edge function: verify-car
// Vérifie une action corrective (accept / reject / request_precision) et notifie le client.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/resend.ts'
import { buildEmailFrom, loadCabinetEmailBranding } from '../_shared/email-branding.ts'
import {
  renderCARAcceptedEmail,
  renderCARRejectedEmail,
  renderCARPrecisionEmail,
} from '../_shared/email-templates/car.ts'

type VerifyAction = 'accept' | 'reject' | 'request_precision'

interface RequestBody {
  car_id: string
  action: VerifyAction
  comment?: string | null
}

function formatDate(d: string | null): string | null {
  if (!d) return null
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !caller) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callerProfile } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', caller.id)
      .single()
    if (!callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = (await req.json()) as RequestBody
    const { car_id, action, comment } = body
    if (!car_id || !action) {
      return new Response(
        JSON.stringify({ error: 'car_id et action requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!['accept', 'reject', 'request_precision'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'action invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if ((action === 'reject' || action === 'request_precision') && (!comment || comment.trim().length < 5)) {
      return new Response(
        JSON.stringify({ error: 'Commentaire requis (min. 5 caractères)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Charger la CAR + mission + cabinet
    const { data: car } = await admin
      .from('corrective_action_requests')
      .select('id, mission_id, code, finding_classification, control_code, control_name, description, deadline, status')
      .eq('id', car_id)
      .single()

    if (!car) {
      return new Response(
        JSON.stringify({ error: 'CAR introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Garde : caller doit être lead_auditor ou associate de la mission, OU mission_member
    const { data: mission } = await admin
      .from('missions')
      .select('id, name, lead_auditor_id, associate_id, cabinet_id, client_id')
      .eq('id', car.mission_id)
      .single()
    if (!mission) {
      return new Response(
        JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isLead = mission.lead_auditor_id === callerProfile.id
    const isAssoc = mission.associate_id === callerProfile.id

    let isMember = false
    if (!isLead && !isAssoc) {
      const { data: mm } = await admin
        .from('mission_members')
        .select('id')
        .eq('mission_id', car.mission_id)
        .eq('user_id', callerProfile.id)
        .maybeSingle()
      isMember = !!mm
    }

    if (!isLead && !isAssoc && !isMember) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (car.status !== 'client_responded') {
      return new Response(
        JSON.stringify({ error: 'Cette action ne peut pas être vérifiée dans son état actuel' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update CAR
    const updates: Record<string, unknown> = {
      verified_by: callerProfile.id,
      verified_at: new Date().toISOString(),
      verification_comment: comment?.trim() ?? null,
    }
    if (action === 'accept') {
      updates.verification_status = 'accepted'
      updates.status = 'verified'
    } else if (action === 'reject') {
      updates.verification_status = 'rejected'
      updates.status = 'open'
    } else {
      updates.verification_status = 'pending'
      updates.status = 'open'
    }

    const { error: updErr } = await admin
      .from('corrective_action_requests')
      .update(updates)
      .eq('id', car_id)

    if (updErr) {
      console.error('verify-car update:', updErr.message)
      return new Response(
        JSON.stringify({ error: 'Mise à jour impossible' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Email au RSSI client (best-effort, non bloquant)
    try {
      const { data: org } = await admin
        .from('organizations')
        .select('name')
        .eq('id', mission.cabinet_id)
        .single()
      const cabinetName = (org as { name: string } | null)?.name ?? 'Gëstu Comply'

      const { data: branding } = await admin
        .from('organization_branding')
        .select('primary_color, accent_color')
        .eq('organization_id', mission.cabinet_id)
        .maybeSingle()
      const br = branding as { primary_color: string | null; accent_color: string | null } | null

      let clientName = 'Client'
      let recipientEmail: string | null = null
      if (mission.client_id) {
        const [{ data: clientOrg }, { data: contacts }] = await Promise.all([
          admin.from('organizations').select('name').eq('id', mission.client_id).single(),
          admin.from('client_portal_contacts')
            .select('email, cabinet_client_id, cabinet_clients!inner(client_organization_id)')
            .eq('cabinet_clients.client_organization_id', mission.client_id)
            .order('created_at', { ascending: true })
            .limit(1),
        ])
        clientName = (clientOrg as { name: string } | null)?.name ?? 'Client'
        const c = (contacts ?? []) as unknown as Array<{ email: string }>
        recipientEmail = c[0]?.email ?? null
      }

      if (recipientEmail) {
        const portalUrl = Deno.env.get('CLIENT_PORTAL_URL') ?? 'https://app.gestugroup.com/portal'
        const ctx = {
          cabinetName,
          primaryColor: br?.primary_color ?? '#1B4332',
          accentColor: br?.accent_color ?? '#D4A843',
          missionName: mission.name,
          clientName,
          carCode: car.code,
          controlLabel: car.control_code && car.control_name ? `${car.control_code} — ${car.control_name}` : (car.control_code ?? car.control_name ?? ''),
          classification: car.finding_classification,
          description: car.description,
          deadline: formatDate(car.deadline),
          portalUrl,
        }

        let rendered: { subject: string; html: string } | null = null
        if (action === 'accept') rendered = renderCARAcceptedEmail(ctx)
        else if (action === 'reject') rendered = renderCARRejectedEmail({ ...ctx, verifierComment: comment ?? '' })
        else rendered = renderCARPrecisionEmail({ ...ctx, verifierComment: comment ?? '' })

        const emailBranding = await loadCabinetEmailBranding(admin, mission.cabinet_id)
        await sendEmail({
          to: recipientEmail,
          subject: rendered.subject,
          html: rendered.html,
          from: buildEmailFrom(emailBranding),
          replyTo: emailBranding?.supportEmail ?? undefined,
        })
      }
    } catch (mailErr) {
      console.error('verify-car email (non bloquant):', mailErr)
    }

    return new Response(
      JSON.stringify({ success: true, action }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('verify-car unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
