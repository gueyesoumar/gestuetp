import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function : decline-evidence-request
 *
 * Permet à un contact du portail client (contributor ou approver de la mission)
 * de déclarer ne pas pouvoir fournir un document demandé. Met la demande à
 * status='declined_by_client' avec motif et justification.
 *
 * Permet aussi d'annuler la déclaration tant que l'auditeur n'a pas tranché
 * (action='cancel') — repasse à 'pending'.
 *
 * Sécurité :
 *  - caller dans le cabinet client de la mission
 *  - cma.permission IN ('contributor','approver')
 *  - decline_reason ∈ {inexistant, non_applicable, confidentialite}
 *  - justification mandatory si reason != inexistant
 */

interface Payload {
  evidence_request_id: string
  action: 'decline' | 'cancel'
  reason?: 'inexistant' | 'non_applicable' | 'confidentialite'
  justification?: string
}

const VALID_REASONS = new Set(['inexistant', 'non_applicable', 'confidentialite'])

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
      .select('id, role, organization_id, is_active')
      .eq('auth_id', caller.id)
      .single()

    if (!callerProfile) return jsonResponse({ error: 'Profil introuvable' }, 403)
    const cp = callerProfile as { id: string; role: string; organization_id: string; is_active: boolean }
    if (!cp.is_active) return jsonResponse({ error: 'Compte désactivé' }, 403)
    if (cp.role !== 'client') return jsonResponse({ error: 'Réservé aux contacts client' }, 403)

    const body = await req.json() as Payload
    const { evidence_request_id, action, reason, justification } = body

    if (!evidence_request_id || !action) {
      return jsonResponse({ error: 'evidence_request_id et action requis' }, 400)
    }
    if (action !== 'decline' && action !== 'cancel') {
      return jsonResponse({ error: 'action doit être decline ou cancel' }, 400)
    }

    // Charger la demande
    const { data: requestData } = await admin
      .from('mission_evidence_requests')
      .select('id, mission_id, status')
      .eq('id', evidence_request_id)
      .single()
    if (!requestData) return jsonResponse({ error: 'Demande introuvable' }, 404)
    const request = requestData as { id: string; mission_id: string; status: string }

    // Vérifier que le caller est contributor/approver sur la mission
    // deno-lint-ignore no-explicit-any
    const { data: accessRows } = await (admin
      .from('client_mission_access') as any)
      .select('permission, client_portal_contacts!inner(user_id)')
      .eq('mission_id', request.mission_id)
      .eq('client_portal_contacts.user_id', cp.id)
      .in('permission', ['contributor', 'approver'])
      .limit(1)

    if (!accessRows || accessRows.length === 0) {
      return jsonResponse({ error: 'Permission insuffisante sur cette mission' }, 403)
    }

    if (action === 'decline') {
      if (!reason || !VALID_REASONS.has(reason)) {
        return jsonResponse({ error: 'Motif invalide' }, 400)
      }
      const justif = (justification ?? '').trim()
      if ((reason === 'non_applicable' || reason === 'confidentialite') && justif.length === 0) {
        return jsonResponse({ error: 'Justification requise pour ce motif' }, 400)
      }
      // On ne peut décliner qu'une demande pending ou reissued
      if (request.status !== 'pending' && request.status !== 'reissued') {
        return jsonResponse({ error: `Statut actuel '${request.status}' ne permet pas la déclaration` }, 409)
      }

      // deno-lint-ignore no-explicit-any
      const { error: updateError } = await (admin.from('mission_evidence_requests') as any)
        .update({
          status: 'declined_by_client',
          decline_reason: reason,
          decline_justification: justif || null,
          declined_by: cp.id,
          declined_at: new Date().toISOString(),
          // Reset éventuelle décision auditeur d'une session précédente
          auditor_response: null,
          auditor_decided_by: null,
          auditor_decided_at: null,
        })
        .eq('id', request.id)
      if (updateError) {
        console.error('[decline-evidence-request] update:', updateError.message)
        return jsonResponse({ error: 'Mise à jour impossible' }, 500)
      }
      return jsonResponse({ success: true, status: 'declined_by_client' })
    }

    // action === 'cancel' : annuler une déclaration tant que l'auditeur n'a pas tranché
    if (request.status !== 'declined_by_client') {
      return jsonResponse({
        error: 'Annulation impossible : la demande n\'est pas en statut declined_by_client',
      }, 409)
    }

    // deno-lint-ignore no-explicit-any
    const { error: cancelError } = await (admin.from('mission_evidence_requests') as any)
      .update({
        status: 'pending',
        decline_reason: null,
        decline_justification: null,
        declined_by: null,
        declined_at: null,
      })
      .eq('id', request.id)
    if (cancelError) {
      console.error('[decline-evidence-request] cancel:', cancelError.message)
      return jsonResponse({ error: 'Annulation impossible' }, 500)
    }
    return jsonResponse({ success: true, status: 'pending' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[decline-evidence-request] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
