// Edge function: generate-action-plan
// Crée idempotemment une CAR par assessment classifié (major_nc / minor_nc / observation).
// Garde : seul le chef de mission ou l'associé peut déclencher.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/resend.ts'

interface AssessmentRow {
  id: string
  finding_classification: string | null
  findings: string | null
  recommendations: string | null
  control_id: string
  controls: { code: string | null; title: string | null } | null
}

interface MissionRow {
  id: string
  name: string
  lead_auditor_id: string | null
  associate_id: string | null
  end_date: string | null
  cabinet_id: string
  client_id: string | null
}

const CLASS_LABEL: Record<string, string> = {
  major_nc: 'NC majeure',
  minor_nc: 'NC mineure',
  observation: 'Observation',
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const DEADLINE_DAYS: Record<string, number> = {
  major_nc: 90,
  minor_nc: 90,
  observation: 180,
}

function addDays(date: string | null, days: number): string | null {
  if (!date) return null
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callerProfile } = await supabaseAdmin
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

    const { mission_id } = await req.json()
    if (!mission_id) {
      return new Response(
        JSON.stringify({ error: 'mission_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: mission } = await supabaseAdmin
      .from('missions')
      .select('id, name, lead_auditor_id, associate_id, end_date, cabinet_id, client_id')
      .eq('id', mission_id)
      .single<MissionRow>()

    if (!mission) {
      return new Response(
        JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (mission.lead_auditor_id !== callerProfile.id && mission.associate_id !== callerProfile.id) {
      return new Response(
        JSON.stringify({ error: 'Seuls le chef de mission et l\'associé peuvent générer le plan d\'action' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Charger les assessments classifiés
    const { data: assessments, error: assessErr } = await supabaseAdmin
      .from('control_assessments')
      .select('id, finding_classification, findings, recommendations, control_id, controls:control_id(code, title)')
      .eq('mission_id', mission_id)
      .in('finding_classification', ['major_nc', 'minor_nc', 'observation'])
      .returns<AssessmentRow[]>()

    if (assessErr) {
      console.error('generate-action-plan assessments:', assessErr.message)
      return new Response(
        JSON.stringify({ error: 'Lecture des évaluations impossible' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const candidates = assessments ?? []
    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ created: 0, skipped: 0, total: 0, cars: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // CAR existantes pour idempotence + numérotation
    const { data: existing, error: existErr } = await supabaseAdmin
      .from('corrective_action_requests')
      .select('id, assessment_id, code')
      .eq('mission_id', mission_id)

    if (existErr) {
      console.error('generate-action-plan existing:', existErr.message)
      return new Response(
        JSON.stringify({ error: 'Lecture des CAR existantes impossible' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const existingByAssessment = new Set((existing ?? []).map((c) => c.assessment_id))
    let nextSeq = 1
    for (const c of existing ?? []) {
      const m = /^CAR-(\d+)$/.exec(c.code)
      if (m) {
        const n = parseInt(m[1], 10)
        if (n >= nextSeq) nextSeq = n + 1
      }
    }

    const toCreate = candidates.filter((a) => !existingByAssessment.has(a.id))

    let created = 0
    const inserted: { id: string; code: string }[] = []

    for (const a of toCreate) {
      const cls = a.finding_classification ?? 'minor_nc'
      const days = DEADLINE_DAYS[cls] ?? 90
      const deadline = addDays(mission.end_date, days)
      const code = `CAR-${String(nextSeq).padStart(3, '0')}`
      nextSeq += 1

      const description = (a.findings && a.findings.trim().length > 0)
        ? a.findings
        : (a.recommendations ?? 'Constat à préciser.')

      const ctrlCode = a.controls?.code ?? null
      const ctrlName = a.controls?.title ?? null
      const normRef = ctrlCode && ctrlName ? `${ctrlCode} — ${ctrlName}` : (ctrlCode ?? ctrlName)

      const { data: insRow, error: insErr } = await supabaseAdmin
        .from('corrective_action_requests')
        .insert({
          mission_id,
          assessment_id: a.id,
          code,
          finding_classification: cls,
          control_code: ctrlCode,
          control_name: ctrlName,
          description,
          normative_reference: normRef,
          deadline,
          status: 'open',
          verification_status: 'pending',
          created_by: callerProfile.id,
        })
        .select('id, code')
        .single()

      if (insErr) {
        console.error('generate-action-plan insert:', insErr.message, code)
        continue
      }
      if (insRow) {
        created += 1
        inserted.push(insRow)
      }
    }

    const skipped = candidates.length - toCreate.length

    // Email récap au RSSI client (best-effort, non bloquant)
    if (created > 0 && mission.client_id) {
      try {
        const [{ data: org }, { data: clientOrg }, { data: branding }, { data: contacts }] = await Promise.all([
          supabaseAdmin.from('organizations').select('name').eq('id', mission.cabinet_id).single(),
          supabaseAdmin.from('organizations').select('name').eq('id', mission.client_id).single(),
          supabaseAdmin.from('organization_branding').select('primary_color').eq('organization_id', mission.cabinet_id).maybeSingle(),
          supabaseAdmin
            .from('client_portal_contacts')
            .select('email, cabinet_clients!inner(client_organization_id)')
            .eq('cabinet_clients.client_organization_id', mission.client_id)
            .order('created_at', { ascending: true })
            .limit(1),
        ])

        const cabinetName = (org as { name: string } | null)?.name ?? 'Gëstu Comply'
        const clientName = (clientOrg as { name: string } | null)?.name ?? 'Client'
        const primary = (branding as { primary_color: string | null } | null)?.primary_color ?? '#1B4332'
        const recipientEmail = ((contacts ?? []) as unknown as Array<{ email: string }>)[0]?.email ?? null
        const portalUrl = Deno.env.get('CLIENT_PORTAL_URL') ?? 'https://app.gestugroup.com/portal'

        if (recipientEmail) {
          // Recharger les CAR insérées avec leurs détails pour la liste email
          const carIds = inserted.map((i) => i.id)
          const { data: createdCars } = await supabaseAdmin
            .from('corrective_action_requests')
            .select('code, finding_classification, control_code, control_name, deadline')
            .in('id', carIds)
            .order('code', { ascending: true })

          const rows = ((createdCars ?? []) as unknown as Array<{
            code: string; finding_classification: string; control_code: string | null;
            control_name: string | null; deadline: string | null;
          }>).map((c) => `
            <tr>
              <td style="padding:8px 10px; border-bottom:1px solid #E5E7EB; font-family:monospace; font-weight:700; color:${escapeHtml(primary)};">${escapeHtml(c.code)}</td>
              <td style="padding:8px 10px; border-bottom:1px solid #E5E7EB;">${escapeHtml(c.control_code ?? '')}</td>
              <td style="padding:8px 10px; border-bottom:1px solid #E5E7EB;">${escapeHtml(CLASS_LABEL[c.finding_classification] ?? c.finding_classification)}</td>
              <td style="padding:8px 10px; border-bottom:1px solid #E5E7EB;">${escapeHtml(c.deadline ?? '—')}</td>
            </tr>`).join('')

          const html = `<!DOCTYPE html><html><body style="margin:0; font-family:'Helvetica Neue',Arial,sans-serif; background:#F5F4F0;">
            <table role="presentation" width="100%" style="background:#F5F4F0;"><tr><td align="center" style="padding:24px 12px;">
              <table role="presentation" width="640" style="max-width:640px; background:white; border-radius:12px; overflow:hidden;">
                <tr><td style="background:${escapeHtml(primary)}; color:white; padding:22px 28px; font-weight:700; font-size:15px;">${escapeHtml(cabinetName)}</td></tr>
                <tr><td style="padding:28px; font-size:14px; color:#1F2937; line-height:1.6;">
                  <h1 style="margin:0 0 8px; font-size:18px; color:${escapeHtml(primary)};">Plan d'action — ${escapeHtml(mission.name)}</h1>
                  <p>Suite à la clôture de l'audit, ${created} action${created > 1 ? 's' : ''} corrective${created > 1 ? 's' : ''} vous ${created > 1 ? 'sont' : 'est'} adressée${created > 1 ? 's' : ''}. Merci de répondre dans le portail dans les délais indiqués.</p>
                  <table role="presentation" width="100%" style="border-collapse:collapse; margin-top:16px; font-size:13px;">
                    <thead><tr style="background:#F9FAFB;">
                      <th style="text-align:left; padding:8px 10px; border-bottom:2px solid #E5E7EB; color:#6B7280;">Code</th>
                      <th style="text-align:left; padding:8px 10px; border-bottom:2px solid #E5E7EB; color:#6B7280;">Contrôle</th>
                      <th style="text-align:left; padding:8px 10px; border-bottom:2px solid #E5E7EB; color:#6B7280;">Type</th>
                      <th style="text-align:left; padding:8px 10px; border-bottom:2px solid #E5E7EB; color:#6B7280;">Échéance</th>
                    </tr></thead>
                    <tbody>${rows}</tbody>
                  </table>
                  <div style="margin-top:24px;">
                    <a href="${escapeHtml(portalUrl)}" style="display:inline-block; background:${escapeHtml(primary)}; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:13px;">Accéder au portail</a>
                  </div>
                </td></tr>
                <tr><td style="background:#FAFAF8; border-top:1px solid #E5E7EB; padding:16px 28px; font-size:11px; color:#6B7280;">
                  ${escapeHtml(cabinetName)} · ${escapeHtml(mission.name)} (${escapeHtml(clientName)})
                </td></tr>
              </table>
            </td></tr></table>
          </body></html>`

          await sendEmail({
            to: recipientEmail,
            subject: `[${cabinetName}] Plan d'action — ${mission.name}`,
            html,
          })
        }
      } catch (mailErr) {
        console.error('generate-action-plan email (non bloquant):', mailErr)
      }
    }

    return new Response(
      JSON.stringify({
        created,
        skipped,
        total: candidates.length,
        cars: inserted,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('generate-action-plan unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
