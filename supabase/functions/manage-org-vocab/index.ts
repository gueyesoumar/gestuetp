// manage-org-vocab — lecture/écriture des overrides de vocabulaire d'une org
// (RFC 0002, P3a). Écriture service_role, double autorisation :
//   - platform owner  → n'importe quelle org
//   - can_edit_organization → sa propre org uniquement
// Toute écriture est journalisée dans admin_audit_log.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'
import { logAdminAction } from '../_shared/auth-platform-owner.ts'
import { logActivity } from '../_shared/audit-log.ts'

// Clés que useVocab applique (RFC 0002 P2b). provider_term/auditor_term restent
// hors périmètre tant que le vocab n'est pas résolu côté serveur (emails).
const EDITABLE_KEYS = [
  'entity_singular', 'entity_plural', 'entities_title', 'entity_with_dem', 'entity_gender',
  'portal_label', 'mission_term', 'finding_term', 'measure_term', 'context_banner', 'context_banner_sub',
  'provider_term', 'auditor_term',
  'lead_term', 'associate_term',
  'client_approver_term', 'client_contributor_term', 'client_viewer_term',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (d: Record<string, unknown>, s = 200): Response =>
    new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const auth = await authenticateCaller(admin, req)
    if (!auth.ok) return json({ error: auth.message }, auth.status)
    const caller = auth.profile

    const body = (await req.json()) as { action?: string; org_id?: string; overrides?: Record<string, string> }
    const action = body.action ?? ''
    const orgId = body.org_id || caller.organization_id
    if (!orgId) return json({ error: 'org_id requis' }, 400)

    // --- Autorisation ---------------------------------------------------------
    const { data: meRow } = await admin.from('users').select('is_platform_owner').eq('id', caller.id).single()
    const isOwner = (meRow as { is_platform_owner?: boolean } | null)?.is_platform_owner === true
    if (!isOwner) {
      if (orgId !== caller.organization_id) return json({ error: 'Accès refusé' }, 403)
      if (!(await hasCabinetPerm(admin, caller.id, 'can_edit_organization'))) {
        return json({ error: 'Permission requise pour modifier la terminologie' }, 403)
      }
    }
    const scope = isOwner ? 'super-admin' : 'org'

    // --- GET ------------------------------------------------------------------
    if (action === 'get') {
      // Persona depuis la capacité supervision (RFC 0006 C+P3) — plus d'édition.
      const { data: cap } = await admin.from('organization_capabilities')
        .select('capability').eq('org_id', orgId).eq('capability', 'supervision').eq('status', 'active').maybeSingle()
      const { data: rows } = await admin.from('organization_vocab').select('key, value').eq('org_id', orgId)
      const overrides: Record<string, string> = {}
      for (const r of (rows ?? []) as Array<{ key: string; value: string }>) overrides[r.key] = r.value
      return json({ persona: cap ? 'regul' : 'comply', overrides })
    }

    // --- SET ------------------------------------------------------------------
    if (action === 'set') {
      const input = body.overrides ?? {}
      const now = new Date().toISOString()
      const upserts: Array<{ org_id: string; key: string; value: string; updated_at: string }> = []
      const cleared: string[] = []
      for (const k of EDITABLE_KEYS) {
        const v = (input[k] ?? '').trim()
        if (v) upserts.push({ org_id: orgId, key: k, value: v, updated_at: now })
        else cleared.push(k)
      }
      if (upserts.length) {
        const { error } = await admin.from('organization_vocab').upsert(upserts, { onConflict: 'org_id,key' })
        if (error) { console.error('[manage-org-vocab] upsert:', error.message); return json({ error: 'Échec de l\'enregistrement' }, 500) }
      }
      if (cleared.length) {
        await admin.from('organization_vocab').delete().eq('org_id', orgId).in('key', cleared)
      }
      await logAdminAction(admin, caller.id, 'org_vocab.set', 'organization', orgId,
        `Mise à jour de la terminologie (${scope})`, { keys: upserts.map((u) => u.key), cleared })
      await logActivity(admin, {
        organizationId: orgId, actorUserId: caller.id,
        action: 'vocab.updated', targetType: 'organization', targetId: orgId,
        summary: `Terminologie mise à jour (${scope})`,
      })
      return json({ success: true })
    }

    // --- RESET ----------------------------------------------------------------
    if (action === 'reset') {
      await admin.from('organization_vocab').delete().eq('org_id', orgId)
      await logAdminAction(admin, caller.id, 'org_vocab.reset', 'organization', orgId,
        `Réinitialisation de la terminologie (${scope})`, {})
      await logActivity(admin, {
        organizationId: orgId, actorUserId: caller.id,
        action: 'vocab.reset', targetType: 'organization', targetId: orgId,
        summary: `Terminologie réinitialisée (${scope})`,
      })
      return json({ success: true })
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (e) {
    console.error('[manage-org-vocab]', e instanceof Error ? e.message : e)
    return json({ error: 'Erreur serveur' }, 500)
  }
})
