import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-view-user
 *
 * Démarre une « session d'aperçu » sur un utilisateur cible.
 *  - Vérifie que l'appelant est platform owner
 *  - Insère une ligne dans admin_view_sessions (audit)
 *  - Insère une notification au target (transparence RGPD)
 *  - Insère une ligne admin_audit_log
 *
 * L'admin navigue ensuite sur /admin/utilisateurs/<id> qui charge les données
 * via Supabase normal. Cette fonction sert uniquement à enregistrer la
 * démarche pour audit + notification.
 */

interface Body {
  target_user_id: string
  reason: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  try {
    const body = await req.json() as Body
    if (!body.target_user_id || !body.reason?.trim()) {
      return jsonResponse({ error: 'target_user_id et reason requis' }, 400)
    }

    // 1. Charger le target
    const { data: target, error: loadError } = await admin
      .from('users')
      .select('id, email, first_name, last_name, organization_id')
      .eq('id', body.target_user_id)
      .single()

    if (loadError || !target) {
      return jsonResponse({ error: 'Utilisateur introuvable' }, 404)
    }
    const t = target as { id: string; email: string; first_name: string; last_name: string; organization_id: string }

    // 2. Anti-spam : skip la notification si une session de moins de 24h existe déjà sur ce couple
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { data: recent } = await admin
      .from('admin_view_sessions')
      .select('id, notified')
      .eq('admin_id', owner.id)
      .eq('target_user_id', t.id)
      .gte('started_at', dayAgo)
      .limit(1)
    const skipNotification = (recent ?? []).some((r) => (r as { notified: boolean }).notified)

    // 3. Insérer la session
    // deno-lint-ignore no-explicit-any
    const { data: insertedSession, error: insertError } = await (admin.from('admin_view_sessions') as any)
      .insert({
        admin_id: owner.id,
        target_user_id: t.id,
        target_org_id: t.organization_id,
        reason: body.reason.trim(),
        notified: !skipNotification,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[admin-view-user] insert error:', insertError.message)
      return jsonResponse({ error: 'Création de la session impossible' }, 500)
    }
    const sessionId = (insertedSession as { id: string } | null)?.id

    // 4. Notification au target (RGPD) — sauf anti-spam 24h
    if (!skipNotification) {
      // deno-lint-ignore no-explicit-any
      await (admin.from('notifications') as any).insert({
        user_id: t.id,
        type: 'admin_view',
        title: 'Un super-admin a consulté votre compte',
        body: 'Pour audit ou support. Contactez-nous si vous avez une question.',
        metadata: { session_id: sessionId, admin_email: owner.email },
      })
    }

    // 5. Audit log
    await logAdminAction(admin, owner.id, 'view_user', 'user', t.id, body.reason, {
      email: t.email,
      session_id: sessionId,
      notification_sent: !skipNotification,
    })

    return jsonResponse({ session_id: sessionId, notification_sent: !skipNotification })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-view-user] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
