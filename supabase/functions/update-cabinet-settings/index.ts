import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

/**
 * Edge Function : update-cabinet-settings
 *
 * Permet à un membre disposant de can_edit_organization (cf. platform_roles)
 * de mettre à jour les paramètres organisationnels personnalisables :
 *   - review_lead_label : libellé du 1er niveau de revue
 *   - review_associate_label : libellé du 2e niveau de revue
 *
 * Sécurité :
 *   - L'appelant doit appartenir au cabinet ciblé
 *   - ET avoir la permission can_edit_organization (OR-aggregée sur ses
 *     platform_roles) — platform_owner = override
 *   - Validation longueur 1-40 chars sur les labels
 *   - Trim systématique
 *   - Audit log avec motif optionnel
 */

interface UpdatePayload {
  review_lead_label?: string | null
  review_associate_label?: string | null
  reason?: string  // optionnel
}

const MAX_LABEL_LEN = 40

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Non autorisé' }, 401)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
    if (authError || !caller) {
      return jsonResponse({ error: 'Non autorisé' }, 401)
    }

    const { data: profileData, error: profileError } = await admin
      .from('users')
      .select('id, organization_id, is_platform_owner, is_active')
      .eq('auth_id', caller.id)
      .single()

    if (profileError || !profileData) {
      return jsonResponse({ error: 'Profil introuvable' }, 403)
    }
    const profile = profileData as { id: string; organization_id: string; is_platform_owner: boolean; is_active: boolean }
    if (!profile.is_active) {
      return jsonResponse({ error: 'Compte désactivé' }, 403)
    }

    // Permission can_edit_organization (platform_owner override géré en interne)
    if (!(await hasCabinetPerm(admin, profile.id, 'can_edit_organization'))) {
      return jsonResponse({ error: 'Permission can_edit_organization requise' }, 403)
    }

    const body = await req.json() as UpdatePayload

    // Validation labels
    const leadLabel = normalizeLabel(body.review_lead_label)
    const associateLabel = normalizeLabel(body.review_associate_label)
    if (leadLabel === 'invalid' || associateLabel === 'invalid') {
      return jsonResponse({ error: `Libellé invalide (1-${MAX_LABEL_LEN} caractères)` }, 400)
    }

    // deno-lint-ignore no-explicit-any
    const { error: updateError } = await (admin.from('organizations') as any)
      .update({
        review_lead_label: leadLabel,
        review_associate_label: associateLabel,
      })
      .eq('id', profile.organization_id)

    if (updateError) {
      console.error('[update-cabinet-settings] update error:', updateError.message)
      return jsonResponse({ error: 'Mise à jour impossible' }, 500)
    }

    // Audit log : optionnel, motif facultatif
    const reason = (body.reason ?? '').trim()
    // deno-lint-ignore no-explicit-any
    await (admin.from('admin_audit_log') as any).insert({
      actor_id: profile.id,
      action: 'update_cabinet_review_labels',
      target_type: 'organization',
      target_id: profile.organization_id,
      reason: reason || 'Mise à jour libellés revue par Associé cabinet',
      metadata: {
        review_lead_label: leadLabel,
        review_associate_label: associateLabel,
        actor_is_platform_owner: profile.is_platform_owner,
      },
    })

    return jsonResponse({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[update-cabinet-settings] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

/**
 * Normalise un libellé : null/undefined/vide → null (= défaut Gëstu).
 * Sinon trim et vérifie 1-40 chars.
 * Retourne 'invalid' (string sentinel) en cas de violation.
 */
function normalizeLabel(value: string | null | undefined): string | null | 'invalid' {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > MAX_LABEL_LEN) return 'invalid'
  return trimmed
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
