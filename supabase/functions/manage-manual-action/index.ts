import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { requireEntitlement } from '../_shared/require-entitlement.ts'

/**
 * manage-manual-action - actions correctives saisies manuellement par le regulateur
 * (Gëstu Regul, Lot 2 Suivi des actions). NON issues d'une mission.
 *
 * Actions : create | set-status
 * Ecriture service_role uniquement (aucune policy write authenticated sur
 * corrective_action_requests pour le regulateur). Gardes : staff regulateur (org
 * de type 'group'), assujetti du sous-arbre, et pour set-status uniquement les
 * lignes source='manual' (jamais les CAR de mission).
 */

const CLASSIFICATIONS = ['major_nc', 'minor_nc', 'observation']
const MANUAL_STATUSES = ['open', 'closed']

interface Payload {
  action: 'create' | 'set-status'
  entity_id?: string
  finding_classification?: string
  description?: string
  deadline?: string | null
  car_id?: string
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

    const denied = await requireEntitlement(admin, caller.organization_id, 'measures')
    if (denied) return denied

    // Sous-arbre du regulateur (assujettis autorises).
    const { data: descRows } = await admin.rpc('get_subsidiary_ids', { parent_id: caller.organization_id })
    const subtree = new Set<string>(((descRows ?? []) as Array<string | { get_subsidiary_ids?: string; id?: string }>)
      .map((r) => (typeof r === 'string' ? r : (r.get_subsidiary_ids ?? r.id ?? ''))))

    const body = (await req.json()) as Payload

    // ---- CREATE ----
    if (body.action === 'create') {
      const entityId = body.entity_id ?? ''
      if (!subtree.has(entityId)) return json({ error: 'Assujetti hors de votre périmètre' }, 403)
      if (!body.finding_classification || !CLASSIFICATIONS.includes(body.finding_classification)) {
        return json({ error: 'Gravité invalide' }, 400)
      }
      if (!body.description?.trim()) return json({ error: 'Description requise' }, 400)

      // Code sequentiel par assujetti, prefixe ACT- (distinct des CAR-xxx de mission).
      const { count } = await admin
        .from('corrective_action_requests')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', entityId)
        .eq('source', 'manual')
      const code = `ACT-${String((count ?? 0) + 1).padStart(3, '0')}`

      const { error } = await admin.from('corrective_action_requests').insert({
        source: 'manual',
        entity_id: entityId,
        mission_id: null,
        assessment_id: null,
        finding_id: null,
        code,
        finding_classification: body.finding_classification,
        description: body.description.trim(),
        deadline: body.deadline ?? null,
        status: 'open',
        created_by: caller.id,
      })
      if (error) { console.error('[manage-manual-action] create:', error.message); return json({ error: "Création de l'action impossible" }, 500) }
      return json({ success: true, code }, 201)
    }

    // ---- SET-STATUS ----
    if (body.action === 'set-status') {
      if (!body.car_id) return json({ error: 'car_id requis' }, 400)
      if (!body.status || !MANUAL_STATUSES.includes(body.status)) return json({ error: 'Statut invalide' }, 400)

      // Verrou de perimetre : action manuelle d'un assujetti du sous-arbre uniquement.
      const { data: target } = await admin
        .from('corrective_action_requests')
        .select('id, source, entity_id')
        .eq('id', body.car_id)
        .maybeSingle()
      if (!target || target.source !== 'manual' || !subtree.has(target.entity_id ?? '')) {
        return json({ error: 'Action introuvable ou hors de votre périmètre' }, 403)
      }

      const { error } = await admin
        .from('corrective_action_requests')
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq('id', body.car_id)
        .eq('source', 'manual')
      if (error) { console.error('[manage-manual-action] set-status:', error.message); return json({ error: 'Changement de statut impossible' }, 500) }
      return json({ success: true })
    }

    return json({ error: 'Action invalide (create ou set-status)' }, 400)
  } catch (err) {
    console.error('[manage-manual-action] unexpected:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
