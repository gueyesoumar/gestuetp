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
// Transitions autorisées via set-status (forward-only). triage -> notified passe
// par l'action `notify`. Empêche de résoudre/notifier sans qualifier d'abord.
const STATUS_TRANSITIONS: Record<string, string[]> = {
  declared: ['triage'],
  triage: ['resolved'],
  notified: ['resolved'],
  resolved: ['closed'],
  closed: [],
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

      // Bornage serveur des dates auto-déclarées : les échéances réglementaires
      // sont ancrées sur detected_at. Sans borne, un assujetti pourrait antidater
      // pour paraître dans les délais. On refuse toute date de détection future
      // et toute survenance postérieure à la détection.
      const now = new Date()
      let detectedAt = now
      if (body.detected_at) {
        const d = new Date(body.detected_at)
        if (isNaN(d.getTime())) return json({ error: 'Date de détection invalide' }, 400)
        if (d.getTime() > now.getTime()) return json({ error: 'La date de détection ne peut être dans le futur' }, 400)
        detectedAt = d
      }
      let occurredAt: Date | null = null
      if (body.occurred_at) {
        const o = new Date(body.occurred_at)
        if (isNaN(o.getTime())) return json({ error: 'Date de survenance invalide' }, 400)
        if (o.getTime() > detectedAt.getTime()) return json({ error: 'La survenance doit précéder la détection' }, 400)
        occurredAt = o
      }

      // Échéances calculées depuis les règles configurables (gelées à la déclaration).
      const { data: rule } = await admin.from('incident_notification_rules').select('initial_hours, final_days').eq('severity', body.severity).single()
      const initialDeadline = rule ? new Date(detectedAt.getTime() + rule.initial_hours * 3600000).toISOString() : null
      const finalDeadline = rule ? new Date(detectedAt.getTime() + rule.final_days * 86400000).toISOString() : null

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
        detected_at: detectedAt.toISOString(),
        occurred_at: occurredAt ? occurredAt.toISOString() : null,
        initial_deadline: initialDeadline,
        final_deadline: finalDeadline,
      }).select('id').single()
      if (error || !inc) { console.error('[declare-incident] insert:', error?.message); return json({ error: 'Erreur lors de la déclaration' }, 500) }

      const anchorErr = await anchor('incident.declared', inc.id, { title: body.title.trim(), category: body.category, severity: body.severity, entity_id: entityId, detected_at: detectedAt.toISOString() })
      if (anchorErr) {
        // Ancrage obligatoire : on annule l'incident pour ne pas laisser d'acte non journalisé.
        await admin.from('incidents').delete().eq('id', inc.id)
        return json({ error: 'Incident non ancré (journal probant)' }, 500)
      }
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
      const allowedNext = STATUS_TRANSITIONS[incident.status] ?? []
      if (!allowedNext.includes(body.status)) {
        return json({ error: `Transition ${incident.status} → ${body.status} non autorisée` }, 400)
      }
      const { error } = await admin.from('incidents').update({ status: body.status }).eq('id', incident.id)
      if (error) return json({ error: 'Erreur de mise à jour' }, 500)
      const aerr = await anchor('incident.status_changed', incident.id, { from: incident.status, to: body.status })
      if (aerr) {
        await admin.from('incidents').update({ status: incident.status }).eq('id', incident.id)
        return json({ error: 'Changement non ancré (journal probant)' }, 500)
      }
      return json({ success: true }, 200)
    }

    // ---- NOTIFY ----
    if (body.action === 'notify') {
      // La notification initiale suppose la qualification préalable.
      if (body.kind !== 'final' && incident.status === 'declared') {
        return json({ error: "Qualifiez l'incident (triage) avant de notifier" }, 400)
      }
      const field = body.kind === 'final' ? 'final_report_at' : 'notified_initial_at'
      const patch: Record<string, unknown> = { [field]: new Date().toISOString() }
      if (body.kind !== 'final' && incident.status === 'triage') patch.status = 'notified'
      const { error } = await admin.from('incidents').update(patch).eq('id', incident.id)
      if (error) return json({ error: 'Erreur de notification' }, 500)
      const aerr = await anchor('incident.notified', incident.id, { kind: body.kind ?? 'initial' })
      if (aerr) {
        const revert: Record<string, unknown> = { [field]: null }
        if (patch.status) revert.status = incident.status
        await admin.from('incidents').update(revert).eq('id', incident.id)
        return json({ error: 'Notification non ancrée (journal probant)' }, 500)
      }
      return json({ success: true }, 200)
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (err) {
    console.error('[declare-incident] unexpected:', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
