import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function : respond-evidence-decline
 *
 * Permet à l'auditeur (membre du cabinet de la mission) de trancher sur une
 * déclaration cliente. Trois actions possibles :
 *
 *  - 'accept'  → status='accepted'  (la déclaration est entérinée, sort du périmètre)
 *  - 'reissue' → status='reissued'  (l'auditeur insiste, repasse en file d'attente
 *                                    avec un commentaire qui notifie le client)
 *  - 'escalate' → status='escalated_to_finding'
 *                + crée un control_assessment en draft sur le contrôle lié,
 *                  pré-rempli à partir du motif et de la justification client.
 *
 * Sécurité :
 *  - caller actif, membre du cabinet de la mission
 *  - demande en statut 'declined_by_client' (sinon 409)
 *  - response_text obligatoire pour 'reissue'
 */

interface Payload {
  evidence_request_id: string
  action: 'accept' | 'reissue' | 'escalate'
  response_text?: string
  /** Pour escalate : permet d'override la classification suggérée. */
  finding_classification?: 'major_nc' | 'minor_nc' | 'observation'
}

const VALID_ACTIONS = new Set(['accept', 'reissue', 'escalate'])

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Non autorisé' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
    if (authError || !caller) return jsonResponse({ error: 'Non autorisé' }, 401)

    const { data: callerProfile } = await admin
      .from('users')
      .select('id, organization_id, is_active')
      .eq('auth_id', caller.id)
      .single()

    if (!callerProfile) return jsonResponse({ error: 'Profil introuvable' }, 403)
    const cp = callerProfile as { id: string; organization_id: string; is_active: boolean }
    if (!cp.is_active) return jsonResponse({ error: 'Compte désactivé' }, 403)

    const body = await req.json() as Payload
    const { evidence_request_id, action } = body
    const responseText = (body.response_text ?? '').trim()

    if (!evidence_request_id || !action) {
      return jsonResponse({ error: 'evidence_request_id et action requis' }, 400)
    }
    if (!VALID_ACTIONS.has(action)) {
      return jsonResponse({ error: 'action doit être accept, reissue ou escalate' }, 400)
    }
    if (action === 'reissue' && responseText.length === 0) {
      return jsonResponse({ error: 'Un commentaire est requis pour réémettre la demande' }, 400)
    }

    // Charger la demande + contexte (mission, evidence catalog → control)
    // deno-lint-ignore no-explicit-any
    const { data: requestData } = await (admin
      .from('mission_evidence_requests') as any)
      .select(`
        id, mission_id, status, decline_reason, decline_justification,
        evidence_catalog:evidence_catalog!inner(id, name, control_id),
        mission:missions!inner(id, cabinet_id)
      `)
      .eq('id', evidence_request_id)
      .single()
    if (!requestData) return jsonResponse({ error: 'Demande introuvable' }, 404)
    const request = requestData as {
      id: string
      mission_id: string
      status: string
      decline_reason: string | null
      decline_justification: string | null
      evidence_catalog: { id: string; name: string; control_id: string }
      mission: { id: string; cabinet_id: string }
    }

    // Membership cabinet
    if (request.mission.cabinet_id !== cp.organization_id) {
      return jsonResponse({ error: 'Cette mission n\'appartient pas à votre cabinet' }, 403)
    }

    // Statut de départ
    if (request.status !== 'declined_by_client') {
      return jsonResponse({
        error: `Statut actuel '${request.status}' ne permet pas cette décision`,
      }, 409)
    }

    const nowIso = new Date().toISOString()

    if (action === 'accept') {
      // deno-lint-ignore no-explicit-any
      const { error: e } = await (admin.from('mission_evidence_requests') as any)
        .update({
          status: 'accepted',
          auditor_response: responseText || null,
          auditor_decided_by: cp.id,
          auditor_decided_at: nowIso,
        })
        .eq('id', request.id)
      if (e) { console.error('[respond-evidence-decline] accept:', e.message); return jsonResponse({ error: 'Mise à jour impossible' }, 500) }
      return jsonResponse({ success: true, status: 'accepted' })
    }

    if (action === 'reissue') {
      // deno-lint-ignore no-explicit-any
      const { error: e } = await (admin.from('mission_evidence_requests') as any)
        .update({
          status: 'reissued',
          auditor_response: responseText,
          auditor_decided_by: cp.id,
          auditor_decided_at: nowIso,
          // On ne reset PAS decline_* pour garder la traçabilité de la séquence
        })
        .eq('id', request.id)
      if (e) { console.error('[respond-evidence-decline] reissue:', e.message); return jsonResponse({ error: 'Mise à jour impossible' }, 500) }
      return jsonResponse({ success: true, status: 'reissued' })
    }

    // action === 'escalate' : créer un control_assessment NC pré-rempli
    const reason = request.decline_reason ?? 'inexistant'
    const suggestedClassif = body.finding_classification
      ?? (reason === 'inexistant' ? 'major_nc' : reason === 'confidentialite' ? 'minor_nc' : 'minor_nc')
    const conformityLevel = suggestedClassif === 'observation' ? 'pc' : 'nc'

    // Vérifier qu'un assessment n'existe pas déjà pour ce contrôle/mission
    // deno-lint-ignore no-explicit-any
    const { data: existing } = await (admin.from('control_assessments') as any)
      .select('id, status')
      .eq('mission_id', request.mission_id)
      .eq('control_id', request.evidence_catalog.control_id)
      .limit(1)
      .maybeSingle()

    let assessmentId: string
    const findings = buildFindings(request.evidence_catalog.name, reason, request.decline_justification)
    const recommendations = buildRecommendation(request.evidence_catalog.name, reason)

    if (existing) {
      const e = existing as { id: string; status: string }
      // On enrichit l'assessment existant (sauf s'il est déjà approved → on respecte)
      if (e.status === 'approved') {
        return jsonResponse({
          error: 'Un assessment validé existe déjà sur ce contrôle. Re-discutez-le manuellement.',
        }, 409)
      }
      // deno-lint-ignore no-explicit-any
      await (admin.from('control_assessments') as any)
        .update({
          status: 'draft',
          conformity_level: conformityLevel,
          finding_classification: suggestedClassif,
          findings,
          recommendations,
        })
        .eq('id', e.id)
      assessmentId = e.id
    } else {
      // Création
      // deno-lint-ignore no-explicit-any
      const { data: newAssess, error: insertErr } = await (admin.from('control_assessments') as any)
        .insert({
          mission_id: request.mission_id,
          control_id: request.evidence_catalog.control_id,
          auditor_id: cp.id,
          status: 'draft',
          conformity_level: conformityLevel,
          finding_classification: suggestedClassif,
          findings,
          recommendations,
        })
        .select('id')
        .single()
      if (insertErr || !newAssess) {
        console.error('[respond-evidence-decline] create assessment:', insertErr?.message)
        return jsonResponse({ error: 'Création de l\'assessment impossible' }, 500)
      }
      assessmentId = (newAssess as { id: string }).id
    }

    // Marquer la demande
    // deno-lint-ignore no-explicit-any
    const { error: updErr } = await (admin.from('mission_evidence_requests') as any)
      .update({
        status: 'escalated_to_finding',
        auditor_response: responseText || null,
        auditor_decided_by: cp.id,
        auditor_decided_at: nowIso,
        escalated_assessment_id: assessmentId,
      })
      .eq('id', request.id)
    if (updErr) { console.error('[respond-evidence-decline] mark escalated:', updErr.message); return jsonResponse({ error: 'Mise à jour impossible' }, 500) }

    return jsonResponse({ success: true, status: 'escalated_to_finding', assessment_id: assessmentId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[respond-evidence-decline] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function buildFindings(docName: string, reason: string, justif: string | null): string {
  const reasonLabel = reason === 'inexistant'
    ? 'que ce document est inexistant dans son organisation'
    : reason === 'non_applicable'
      ? 'que ce contrôle ne s\'applique pas à son contexte'
      : 'que ce document existe mais est soumis à confidentialité'
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  let text = `L'organisation n'a pas fourni le document attendu « ${docName} ». Le client a déclaré le ${today} ${reasonLabel}.`
  if (justif && justif.trim().length > 0) {
    text += `\n\nJustification du client : ${justif.trim()}`
  }
  text += `\n\nCette absence ne permet pas de démontrer la conformité aux exigences correspondantes.`
  return text
}

function buildRecommendation(docName: string, reason: string): string {
  if (reason === 'inexistant') {
    return `Élaborer et formaliser le document « ${docName} » couvrant les exigences attendues. Le faire valider par la direction et le tester avant la prochaine revue.`
  }
  if (reason === 'non_applicable') {
    return `Documenter formellement les motifs d'exclusion du contrôle dans la déclaration d'applicabilité (SoA), avec validation par la direction.`
  }
  return `Mettre à disposition une preuve alternative (entretien dirigé, walk-through, attestation managériale) permettant de couvrir l'objectif du contrôle sans exposer le document confidentiel.`
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
