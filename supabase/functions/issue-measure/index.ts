// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'

/**
 * issue-measure — mesures graduées du régulateur (Gëstu Regul / M4).
 *
 * Actions : issue | escalate | set-status
 * Chaque acte est ANCRÉ dans probative_log (S1) via une insertion service_role
 * (le trigger base calcule le hash chaîné). Gardes : staff régulateur, assujetti
 * du sous-arbre. Écriture service_role uniquement (aucune policy write client).
 */

const MEASURE_TYPES = ['recommandation', 'mise_en_demeure', 'injonction', 'sanction']
const ORDER: Record<string, number> = { recommandation: 0, mise_en_demeure: 1, injonction: 2, sanction: 3 }
const STATUSES = ['draft', 'issued', 'acknowledged', 'resolved', 'appealed', 'closed']

interface Payload {
  action: 'issue' | 'escalate' | 'set-status'
  entity_id?: string
  mission_id?: string | null
  finding_ids?: string[]
  measure_type?: string
  title?: string
  legal_basis?: string | null
  body?: string | null
  deadline?: string | null
  reference?: string | null
  measure_id?: string
  status?: string
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const auth = await authenticateCaller(admin, req)
    if (!auth.ok) return json({ error: auth.message }, auth.status)
    const caller = auth.profile
    if (caller.role === 'client') return json({ error: 'Accès refusé' }, 403)

    const { data: callerOrg } = await admin.from('organizations').select('types').eq('id', caller.organization_id).single()
    if (!(Array.isArray(callerOrg?.types) && callerOrg!.types.includes('group'))) {
      return json({ error: "Votre organisation n'est pas un régulateur" }, 403)
    }

    // Sous-arbre du régulateur (assujettis autorisés).
    const { data: descRows } = await admin.rpc('get_subsidiary_ids', { parent_id: caller.organization_id })
    const subtree = new Set<string>(((descRows ?? []) as Array<string | { get_subsidiary_ids?: string; id?: string }>)
      .map((r) => (typeof r === 'string' ? r : (r.get_subsidiary_ids ?? r.id ?? ''))))

    const body = (await req.json()) as Payload
    const nowIso = new Date().toISOString()

    // Ancre un acte dans le journal probant (best-effort loggé, mais on renvoie
    // une erreur si l'ancrage échoue : un acte non tracé n'a pas de valeur).
    const anchor = async (action_type: string, measureId: string, extra: Record<string, unknown>): Promise<string | null> => {
      const { error } = await admin.from('probative_log').insert({
        actor_user_id: caller.id, action_type, subject_type: 'measure', subject_id: measureId, payload: extra,
      })
      if (error) { console.error('[issue-measure] anchor:', error.message); return error.message }
      return null
    }

    // ---- ISSUE ----
    if (body.action === 'issue') {
      const entityId = body.entity_id ?? ''
      if (!subtree.has(entityId)) return json({ error: "Assujetti hors de votre périmètre" }, 403)
      if (!body.measure_type || !MEASURE_TYPES.includes(body.measure_type)) return json({ error: 'Type de mesure invalide' }, 400)
      if (!body.title?.trim()) return json({ error: 'Titre requis' }, 400)
      const { data: m, error } = await admin.from('regulatory_measures').insert({
        entity_id: entityId,
        mission_id: body.mission_id ?? null,
        finding_ids: body.finding_ids ?? [],
        measure_type: body.measure_type,
        status: 'issued',
        title: body.title.trim(),
        legal_basis: body.legal_basis ?? null,
        body: body.body ?? null,
        deadline: body.deadline ?? null,
        reference: body.reference ?? null,
        issued_at: nowIso,
        issued_by: caller.id,
      }).select('*').single()
      if (error) { console.error('[issue-measure] issue:', error.message); return json({ error: "Impossible d'émettre la mesure" }, 500) }
      const aerr = await anchor('measure.issued', m.id, { measure_type: m.measure_type, entity_id: m.entity_id, deadline: m.deadline, reference: m.reference })
      if (aerr) return json({ error: "Acte non ancré dans le journal probant" }, 500)
      return json({ measure: m }, 201)
    }

    // ---- ESCALATE ----
    if (body.action === 'escalate') {
      const { data: src, error: srcErr } = await admin.from('regulatory_measures').select('*').eq('id', body.measure_id ?? '').single()
      if (srcErr || !src) return json({ error: 'Mesure source introuvable' }, 404)
      if (!subtree.has(src.entity_id)) return json({ error: 'Mesure hors de votre périmètre' }, 403)
      if (!body.measure_type || !MEASURE_TYPES.includes(body.measure_type)) return json({ error: 'Type de mesure invalide' }, 400)
      if (ORDER[body.measure_type] <= ORDER[src.measure_type]) return json({ error: "L'escalade doit viser un niveau supérieur" }, 400)
      if (!body.title?.trim()) return json({ error: 'Titre requis' }, 400)
      const { data: m, error } = await admin.from('regulatory_measures').insert({
        entity_id: src.entity_id,
        mission_id: src.mission_id,
        finding_ids: src.finding_ids,
        measure_type: body.measure_type,
        status: 'issued',
        title: body.title.trim(),
        legal_basis: body.legal_basis ?? null,
        body: body.body ?? null,
        deadline: body.deadline ?? null,
        reference: body.reference ?? null,
        parent_measure_id: src.id,
        issued_at: nowIso,
        issued_by: caller.id,
      }).select('*').single()
      if (error) { console.error('[issue-measure] escalate:', error.message); return json({ error: "Escalade impossible" }, 500) }
      const aerr = await anchor('measure.escalated', m.id, { measure_type: m.measure_type, from: src.measure_type, parent_measure_id: src.id, entity_id: m.entity_id })
      if (aerr) return json({ error: "Acte non ancré dans le journal probant" }, 500)
      return json({ measure: m }, 201)
    }

    // ---- SET-STATUS ----
    if (body.action === 'set-status') {
      if (!body.status || !STATUSES.includes(body.status)) return json({ error: 'Statut invalide' }, 400)
      const { data: src, error: srcErr } = await admin.from('regulatory_measures').select('id, entity_id, status').eq('id', body.measure_id ?? '').single()
      if (srcErr || !src) return json({ error: 'Mesure introuvable' }, 404)
      if (!subtree.has(src.entity_id)) return json({ error: 'Mesure hors de votre périmètre' }, 403)
      const { data: m, error } = await admin.from('regulatory_measures').update({ status: body.status }).eq('id', src.id).select('*').single()
      if (error) { console.error('[issue-measure] set-status:', error.message); return json({ error: 'Changement de statut impossible' }, 500) }
      const aerr = await anchor('measure.status_changed', m.id, { from: src.status, to: body.status, entity_id: m.entity_id })
      if (aerr) return json({ error: "Acte non ancré dans le journal probant" }, 500)
      return json({ measure: m })
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (e) {
    console.error('[issue-measure] unexpected:', e instanceof Error ? e.message : String(e))
    return json({ error: 'Erreur interne' }, 500)
  }
})
