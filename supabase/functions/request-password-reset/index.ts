import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/resend.ts'
import { passwordResetTemplate } from '../_shared/email-templates/auth.ts'
import { resolveCabinetSiteUrl } from '../_shared/cabinet-site-url.ts'
import { createSetupToken, buildSetupLink } from '../_shared/setup-token.ts'
import { buildEmailFrom, loadCabinetEmailBranding } from '../_shared/email-branding.ts'

/**
 * Edge Function PUBLIQUE : request-password-reset
 *
 * Flux « mot de passe oublié » depuis la page de connexion. Envoie un email de
 * réinitialisation via Resend (lien brandé sur le domaine cabinet, token_hash),
 * comme tous les autres flux — et NON via le SMTP natif de Supabase (rate-limité,
 * lien non brandé).
 *
 * Sécurité :
 *  - Anti-énumération : réponse NEUTRE `{ ok: true }` que l'email existe ou non.
 *  - Aucune donnée utilisateur renvoyée. verify_jwt=false (appel non authentifié).
 */

interface Body {
  email?: string
}

function neutral(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = (await req.json().catch(() => ({}))) as Body
    const email = body.email?.trim().toLowerCase()
    if (!email) return neutral()

    // Résoudre l'utilisateur (sans jamais révéler son existence dans la réponse).
    const { data: user } = await admin
      .from('users')
      .select('id, first_name, email, organization_id, is_active')
      .eq('email', email)
      .maybeSingle()
    const u = user as { id: string; first_name: string; email: string; organization_id: string; is_active: boolean } | null
    if (!u || !u.is_active) return neutral()

    // Jeton maison (reset, 1 h) — lien brandé, consommé uniquement à la soumission.
    const siteUrl = await resolveCabinetSiteUrl(admin, u.organization_id)
    const tokenRes = await createSetupToken(admin, { userId: u.id, purpose: 'reset', ttlHours: 1 })
    if ('error' in tokenRes) {
      console.warn('[request-password-reset] token:', tokenRes.error)
      return neutral()
    }
    const link = buildSetupLink(siteUrl, tokenRes.raw)

    const branding = await loadCabinetEmailBranding(admin, u.organization_id)
    const sendResult = await sendEmail({
      to: u.email,
      subject: `Réinitialisation de votre mot de passe — ${branding?.cabinetName ?? 'Gëstu ETP'}`,
      html: passwordResetTemplate({ firstName: u.first_name || u.email, link, branding }),
      from: buildEmailFrom(branding),
      replyTo: branding?.supportEmail ?? undefined,
    })
    if (sendResult.error) console.warn('[request-password-reset] sendEmail:', sendResult.error)

    return neutral()
  } catch (err) {
    console.error('[request-password-reset]', err instanceof Error ? err.message : err)
    // Réponse neutre même en cas d'erreur interne (anti-énumération / anti-oracle).
    return neutral()
  }
})
