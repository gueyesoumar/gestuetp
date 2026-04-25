import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/resend.ts'
import { reminderHtml, reminderSubject, type Palier, type ReminderContext } from '../_shared/email-templates/reminder.ts'

/**
 * Edge Function : evidence-reminders
 *
 * Tirée par pg_cron tous les jours à 07:00 UTC, parcourt les
 * mission_evidence_requests en `pending` et envoie des relances graduées
 * (J+3 / J+7 / J+14) au référent client de la mission.
 *
 * Idempotente :
 *   - le UNIQUE(user, type, related_id) sur email_log empêche tout doublon
 *   - on filtre sur email_preferences.reminders_enabled = true
 *   - on n'envoie qu'au plus une relance par exécution et par demande
 *
 * Sécurité :
 *   - aucun secret côté client, RESEND_API_KEY reste server-side
 *   - les contenus utilisateur (mission name, evidence name) sont escapés
 *     avant inclusion dans le HTML email
 *   - la fonction n'accepte que des appels avec le service-role bearer
 */

interface EvidenceRequestRow {
  id: string
  mission_id: string
  evidence_catalog_id: string
  status: string
  due_date: string | null
  created_at: string
  evidence_catalog: { name: string; control_id: string | null } | null
  mission: {
    name: string
    client_id: string
    cabinet_clients: { client_name: string } | null
  } | null
}

interface RecipientRow {
  id: string
  first_name: string
  last_name: string
  email: string
  email_preferences: { reminders_enabled: boolean; unsubscribe_token: string } | null
}

const PALIER_THRESHOLDS: Array<{ palier: Palier; minDays: number; maxDays: number }> = [
  { palier: 'j14', minDays: 14, maxDays: Number.POSITIVE_INFINITY },
  { palier: 'j7', minDays: 7, maxDays: 13 },
  { palier: 'j3', minDays: 3, maxDays: 6 },
]

function pickPalier(ageDays: number): Palier | null {
  for (const t of PALIER_THRESHOLDS) {
    if (ageDays >= t.minDays && ageDays <= t.maxDays) return t.palier
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Authentification : seul le service-role peut déclencher la cron
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (token !== serviceKey) {
    return jsonResponse({ error: 'Non autorisé' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(supabaseUrl, serviceKey)
  const appBaseUrl = Deno.env.get('APP_BASE_URL') ?? 'https://app.gestucomply.com'

  // 1. Récupérer toutes les demandes en attente
  const { data: requests, error: reqError } = await admin
    .from('mission_evidence_requests')
    .select(`
      id,
      mission_id,
      evidence_catalog_id,
      status,
      due_date,
      created_at,
      evidence_catalog:evidence_catalog!inner(name, control_id),
      mission:missions!inner(name, client_id, cabinet_clients:cabinet_clients!missions_client_id_fkey(client_name))
    `)
    .eq('status', 'pending')

  if (reqError) {
    console.error('[evidence-reminders] requests error:', reqError.message)
    return jsonResponse({ error: 'Lecture des demandes impossible' }, 500)
  }

  const rows = (requests ?? []) as unknown as EvidenceRequestRow[]
  const now = new Date()
  let sent = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    const reference = row.due_date ? new Date(row.due_date) : new Date(row.created_at)
    const ageDays = Math.floor((now.getTime() - reference.getTime()) / 86_400_000)
    const palier = pickPalier(ageDays)
    if (!palier) {
      skipped++
      continue
    }

    // 2. Pour chaque demande, identifier le destinataire (référent client de la mission)
    const recipient = await findRecipient(admin, row.mission?.client_id ?? null)
    if (!recipient || !recipient.email_preferences?.reminders_enabled) {
      skipped++
      continue
    }

    // 3. Anti-doublon : vérifier que ce palier n'a pas déjà été envoyé
    const { data: existingLog } = await admin
      .from('email_log')
      .select('id')
      .eq('user_id', recipient.id)
      .eq('type', `reminder_${palier}`)
      .eq('related_id', row.id)
      .maybeSingle()

    if (existingLog) {
      skipped++
      continue
    }

    // 4. Construire le contexte et envoyer
    const controlCode = await loadControlCode(admin, row.evidence_catalog?.control_id ?? null)
    const overdue = row.due_date ? Math.max(0, ageDays) : 0

    const ctx: ReminderContext = {
      recipientFirstName: recipient.first_name || 'bonjour',
      evidenceName: row.evidence_catalog?.name ?? 'Document demandé',
      missionName: row.mission?.name ?? 'votre mission',
      clientName: row.mission?.cabinet_clients?.client_name ?? '',
      controlCode,
      requestedAt: row.created_at,
      daysOverdue: overdue,
      ageDays,
      uploadUrl: `${appBaseUrl}/client/missions/${row.mission_id}`,
      contactAuditorUrl: `${appBaseUrl}/client/missions/${row.mission_id}`,
      unsubscribeUrl: `${appBaseUrl}/unsubscribe?token=${encodeURIComponent(recipient.email_preferences.unsubscribe_token)}`,
    }

    const subject = reminderSubject(palier, ctx)
    const html = reminderHtml(palier, ctx)

    const result = await sendEmail({ to: recipient.email, subject, html })
    if (result.error) {
      console.error(`[evidence-reminders] resend failed for ${recipient.email}:`, result.error)
      failed++
      continue
    }

    // 5. Logger l'envoi (idempotence garantie par UNIQUE)
    await admin.from('email_log').insert({
      user_id: recipient.id,
      type: `reminder_${palier}`,
      related_id: row.id,
      resend_id: result.id ?? null,
    })

    await admin
      .from('mission_evidence_requests')
      .update({ last_reminder_at: now.toISOString() })
      .eq('id', row.id)

    sent++
  }

  console.log(`[evidence-reminders] sent=${sent} skipped=${skipped} failed=${failed}`)
  return jsonResponse({ sent, skipped, failed })
})

async function findRecipient(
  admin: ReturnType<typeof createClient>,
  clientOrgId: string | null,
): Promise<RecipientRow | null> {
  if (!clientOrgId) return null
  // Récupère le 1er référent métier (client_role) actif de l'organisation cliente
  const { data } = await admin
    .from('users')
    .select(`
      id, first_name, last_name, email, is_active,
      email_preferences:email_preferences(reminders_enabled, unsubscribe_token)
    `)
    .eq('organization_id', clientOrgId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  return (data as unknown as RecipientRow) ?? null
}

async function loadControlCode(
  admin: ReturnType<typeof createClient>,
  controlId: string | null,
): Promise<string | null> {
  if (!controlId) return null
  const { data } = await admin.from('controls').select('code').eq('id', controlId).maybeSingle()
  return (data as { code?: string } | null)?.code ?? null
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
