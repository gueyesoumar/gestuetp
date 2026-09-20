import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Soumission de masse « Marquer conforme & soumettre » (voie express Conforme, RFC UX Lot 3).
//
// Pour chaque assessment fourni, la fonction n'agit QUE si :
//   - l'appelant est l'auditeur affecté
//   - le statut est 'draft' ou 'rejected'
//   - il n'a AUCUN constat (assessment_findings)
// Alors : niveau de conformité = 'c', on joint une observation standard
// « Conforme, aucun écart identifié. », puis on soumet (mêmes règles que
// submit-assessment, y compris le saut de revue lead). Tout le reste est
// ignoré avec un motif — jamais de contrôle porteur de constats touché, donc
// aucune incohérence NC/matrice possible. La transition de mission est calculée
// une seule fois par mission concernée, à la fin.

interface BulkResult { assessment_id: string; ok: boolean; reason?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (body: unknown, status: number): Response =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autorisé' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Appelant
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
    if (authError || !caller) return json({ error: 'Non autorisé' }, 401)

    const { data: callerProfile } = await admin
      .from('users')
      .select('id, is_active')
      .eq('auth_id', caller.id)
      .single()
    if (!callerProfile || !callerProfile.is_active) return json({ error: 'Profil introuvable' }, 403)

    // 2. Payload
    const { assessment_ids } = await req.json()
    if (!Array.isArray(assessment_ids) || assessment_ids.length === 0) {
      return json({ error: 'assessment_ids requis' }, 400)
    }
    if (assessment_ids.length > 200) {
      return json({ error: 'Trop de contrôles sélectionnés (max 200)' }, 400)
    }
    const ids: string[] = [...new Set(assessment_ids.map((x: unknown) => String(x)))]

    // 3. Charger les assessments + comptes de constats + missions (pour le saut lead)
    const { data: assessments } = await admin
      .from('control_assessments')
      .select('id, auditor_id, mission_id, status')
      .in('id', ids)
    const byId = new Map((assessments ?? []).map((a) => [a.id as string, a]))

    const { data: findingRows } = await admin
      .from('assessment_findings')
      .select('assessment_id')
      .in('assessment_id', ids)
    const findingCount = new Map<string, number>()
    for (const f of findingRows ?? []) {
      const k = (f as { assessment_id: string }).assessment_id
      findingCount.set(k, (findingCount.get(k) ?? 0) + 1)
    }

    const missionIds = [...new Set((assessments ?? []).map((a) => a.mission_id as string))]
    const { data: missionRows } = await admin
      .from('missions')
      .select('id, lead_auditor_id, associate_id')
      .in('id', missionIds)
    const missionById = new Map((missionRows ?? []).map((m) => [m.id as string, m]))

    const results: BulkResult[] = []
    const affectedMissions = new Set<string>()
    let submitted = 0

    for (const id of ids) {
      const a = byId.get(id)
      if (!a) { results.push({ assessment_id: id, ok: false, reason: 'introuvable' }); continue }
      if (a.auditor_id !== callerProfile.id) { results.push({ assessment_id: id, ok: false, reason: 'non affecté' }); continue }
      if (a.status !== 'draft' && a.status !== 'rejected') { results.push({ assessment_id: id, ok: false, reason: 'déjà soumis' }); continue }
      if ((findingCount.get(id) ?? 0) > 0) { results.push({ assessment_id: id, ok: false, reason: 'a déjà des constats' }); continue }

      // Constat auto « Conforme » (cohérent avec le niveau 'c' dans la matrice métier).
      const { error: fErr } = await admin.from('assessment_findings').insert({
        assessment_id: id,
        ord: 0,
        classification: 'observation',
        description: 'Conforme, aucun écart identifié.',
        ai_generated: false,
      })
      if (fErr) { results.push({ assessment_id: id, ok: false, reason: 'erreur constat' }); continue }

      // Saut de revue lead (identique à submit-assessment).
      const mission = missionById.get(a.mission_id)
      const isLead = mission?.lead_auditor_id === callerProfile.id
      const hasAssociate = !!mission?.associate_id
      const newStatus = isLead && hasAssociate ? 'in_review' : 'submitted'

      const { error: uErr } = await admin
        .from('control_assessments')
        .update({ status: newStatus, conformity_level: 'c', conformity_override_reason: null })
        .eq('id', id)
      if (uErr) { results.push({ assessment_id: id, ok: false, reason: 'erreur soumission' }); continue }

      await admin.from('assessment_validations').insert({
        assessment_id: id,
        stage: 'auditor_submitted',
        decision: 'approved',
        comment: isLead ? 'Soumis par le chef de mission — revue lead sautée' : null,
        validated_by: callerProfile.id,
      })
      if (isLead && hasAssociate) {
        await admin.from('assessment_validations').insert({
          assessment_id: id,
          stage: 'lead_review',
          decision: 'approved',
          comment: 'Validation automatique — constat soumis par le chef de mission lui-même',
          validated_by: callerProfile.id,
        })
      }

      submitted++
      affectedMissions.add(a.mission_id as string)
      results.push({ assessment_id: id, ok: true })
    }

    // 4. Transition de mission, une fois par mission concernée.
    for (const mid of affectedMissions) {
      await admin.from('missions')
        .update({ status: 'fieldwork' })
        .eq('id', mid)
        .in('status', ['initialization', 'scoping', 'planning'])

      const { data: all } = await admin
        .from('control_assessments')
        .select('status')
        .eq('mission_id', mid)
      if (all && all.length > 0) {
        const allSubmitted = all.every((x: { status: string }) =>
          x.status === 'submitted' || x.status === 'in_review' || x.status === 'approved')
        if (allSubmitted) {
          await admin.from('missions')
            .update({ status: 'internal_review' })
            .eq('id', mid)
            .eq('status', 'fieldwork')
        }
      }
    }

    return json({ success: true, submitted_count: submitted, results }, 200)
  } catch (err) {
    console.error('submit-assessments-bulk unexpected:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
