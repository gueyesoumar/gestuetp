import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'

// Gëstu Regul (M5) : déclaration et suivi d'incidents cyber. Chaque acte est
// ancré dans probative_log (S1). Écritures réservées à cette fonction (service_role).

interface Payload {
  action: 'declare' | 'set-status' | 'notify'
  // declare
  entity_id?: string
  mission_id?: string | null
  title?: string
  category?: string
  severity?: string
  description?: string
  impact?: string
  affected_systems?: string
  detected_at?: string | null
  occurred_at?: string | null
  // set-status / notify
  incident_id?: string
  status?: string
  kind?: 'initial' | 'final'
}

const CATEGORIES = ['intrusion', 'ransomware', 'fuite_donnees', 'deni_service', 'autre']
const SEVERITIES = ['faible', 'moyen', 'eleve', 'critique']
const STATUSES = ['declared', 'triage', 'notified', 'resolved', 'closed']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, s: number): Response =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const auth = await authenticateCaller(admin, req)
    if (!auth.ok) return json({ error: auth.message }, auth.status)
    const caller = auth.profile
    const isClient = caller.role === 'client'

    // Périmètre autorisé : assujetti = org(s) de son contact portail (entity_org_id,
    // scope canonique M7 — PAS organization_id, ambigu côté client) ; staff = sous-arbre.
    let allowed: Set<string>
    if (isClient) {
      const { data: cpc } = await admin
        .from('client_portal_contacts')
        .select('entity_org_id')
        .eq('user_id', caller.id)
        .not('entity_org_id', 'is', null)
      allowed = new Set(((cpc ?? []) as Array<{ entity_org_id: string }>).map((r) => r.entity_org_id))
    } else {
      const { data: rows } = await admin.rpc('get_subsidiary_ids', { parent_id: caller.organization_id })
      allowed = new Set(
        ((rows ?? []) as Array<string | { get_subsidiary_ids?: string; id?: string }>)
          .map((r) => (typeof r === 'string' ? r : (r.get_subsidiary_ids ?? r.id ?? '')))
          .filter(Boolean),
      )
    }

    const body = (await req.json()) as Payload

    const anchor = async (action_type: string, incidentId: string, extra: Record<string, unknown>): Promise<string | null> => {
      const { error } = await admin.from('probative_log').insert({
        actor_user_id: caller.id, action_type, subject_type: 'incident', subject_id: incidentId, payload: extra,
      })
      if (error) { console.error('[declare-incident] anchor:', error.message); return error.message }
      return null
    }

    // ---- DECLARE ----
    if (body.action === 'declare') {
      // Un assujetti mono-org déclare toujours pour SA org (on ignore l'entrée client).
      let entityId = body.entity_id ?? ''
      if (isClient && allowed.size === 1) entityId = [...allowed][0]
      if (!allowed.has(entityId)) return json({ error: 'Assujetti hors de votre périmètre' }, 403)
      if (!body.title?.trim()) return json({ error: 'Titre requis' }, 400)
      if (!body.category || !CATEGORIES.includes(body.category)) return json({ error: 'Catégorie invalide' }, 400)
      if (!body.severity || !SEVERITIES.includes(body.severity)) return json({ error: 'Gravité invalide' }, 400)

      // Échéances calculées depuis les règles configurables (gelées à la déclaration).
      const { data: rule } = await admin.from('incident_notification_rules').select('initial_hours, final_days').eq('severity', body.severity).single()
      const base = body.detected_at ? new Date(body.detected_at) : new Date()
      const initialDeadline = rule ? new Date(base.getTime() + rule.initial_hours * 3600000).toISOString() : null
      const finalDeadline = rule ? new Date(base.getTime() + rule.final_days * 86400000).toISOString() : null

      const { data: inc, error } = await admin.from('incidents').insert({
        entity_id: entityId,
        mission_id: body.mission_id ?? null,
        declared_by: caller.id,
        title: body.title.trim(),
        category: body.category,
        severity: body.severity,
        description: body.description ?? null,
        impact: body.impact ?? null,
        affected_systems: body.affected_systems ?? null,
        detected_at: body.detected_at ?? null,
        occurred_at: body.occurred_at ?? null,
        initial_deadline: initialDeadline,
        final_deadline: finalDeadline,
      }).select('id').single()
      if (error || !inc) { console.error('[declare-incident] insert:', error?.message); return json({ error: 'Erreur lors de la déclaration' }, 500) }

      const anchorErr = await anchor('incident.declared', inc.id, { title: body.title.trim(), category: body.category, severity: body.severity, entity_id: entityId })
      if (anchorErr) return json({ error: 'Incident non ancré (journal probant)' }, 500)
      return json({ success: true, incident_id: inc.id }, 201)
    }

    // Les actes de triage/notification sont réservés au staff régulateur.
    if (isClient) return json({ error: 'Action réservée au régulateur' }, 403)
    if (!body.incident_id) return json({ error: 'incident_id requis' }, 400)

    const { data: incident } = await admin.from('incidents').select('id, entity_id, status').eq('id', body.incident_id).single()
    if (!incident || !allowed.has(incident.entity_id)) return json({ error: 'Incident hors de votre périmètre' }, 403)

    // ---- SET-STATUS ----
    if (body.action === 'set-status') {
      if (!body.status || !STATUSES.includes(body.status)) return json({ error: 'Statut invalide' }, 400)
      const { error } = await admin.from('incidents').update({ status: body.status }).eq('id', incident.id)
      if (error) return json({ error: 'Erreur de mise à jour' }, 500)
      await anchor('incident.status_changed', incident.id, { from: incident.status, to: body.status })
      return json({ success: true }, 200)
    }

    // ---- NOTIFY ----
    if (body.action === 'notify') {
      const field = body.kind === 'final' ? 'final_report_at' : 'notified_initial_at'
      const patch: Record<string, unknown> = { [field]: new Date().toISOString() }
      if (body.kind !== 'final' && incident.status === 'triage') patch.status = 'notified'
      const { error } = await admin.from('incidents').update(patch).eq('id', incident.id)
      if (error) return json({ error: 'Erreur de notification' }, 500)
      await anchor('incident.notified', incident.id, { kind: body.kind ?? 'initial' })
      return json({ success: true }, 200)
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (err) {
    console.error('[declare-incident] unexpected:', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
