// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner, logAdminAction } from '../_shared/auth-platform-owner.ts'
import { logActivity } from '../_shared/audit-log.ts'

// Réinitialisation MFA d'un compte (perte d'appareil). Réservé au super-admin,
// qui doit lui-même être en AAL2 (si l'enforcement est actif), et journalisé.
// Supprime les facteurs MFA du compte cible pour lui permettre de ré-enrôler.

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function readAal(token: string): string | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof claims?.aal === 'string' ? claims.aal : null
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { owner, admin } = guard

  // L'admin qui réinitialise doit lui-même avoir passé la MFA (défense cohérente).
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
  if (Deno.env.get('MFA_ENFORCE') === 'on' && readAal(token) !== 'aal2') {
    return json({ error: 'Authentification à deux facteurs requise' }, 401)
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { email?: string; reason?: string }
    const email = body.email?.trim().toLowerCase()
    const reason = body.reason?.trim()
    if (!email) return json({ error: 'email requis' }, 400)
    if (!reason) return json({ error: 'Motif obligatoire' }, 400)

    const { data: target } = await (admin.from('users') as any)
      .select('id, auth_id, organization_id').eq('email', email).single()
    if (!target) return json({ error: 'Utilisateur introuvable' }, 404)
    const t = target as { id: string; auth_id: string; organization_id: string }

    const { data: list, error: listErr } = await admin.auth.admin.mfa.listFactors({ userId: t.auth_id })
    if (listErr) { console.error('[admin-reset-mfa] list:', listErr.message); return json({ error: 'Réinitialisation impossible' }, 500) }
    const factors = list?.factors ?? []
    for (const f of factors) {
      const { error: delErr } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: t.auth_id })
      if (delErr) { console.error('[admin-reset-mfa] delete:', delErr.message); return json({ error: 'Réinitialisation incomplète' }, 500) }
    }

    await logAdminAction(admin, owner.id, 'reset_mfa', 'user', t.id, reason, { email, factors_deleted: factors.length })
    if (t.organization_id) {
      await logActivity(admin, {
        organizationId: t.organization_id, actorUserId: owner.id,
        action: 'mfa.reset', targetType: 'member', targetId: t.id,
        summary: `MFA réinitialisé pour ${email}`,
      })
    }
    return json({ success: true, factors_deleted: factors.length }, 200)
  } catch (e) {
    console.error('[admin-reset-mfa] unexpected:', e instanceof Error ? e.message : String(e))
    return json({ error: 'Erreur interne' }, 500)
  }
})
