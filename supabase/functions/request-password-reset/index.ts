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
 *  - Anti-oracle temporel : la résolution utilisateur + l'envoi d'email se font en
 *    TÂCHE DE FOND (EdgeRuntime.waitUntil) ; la réponse est renvoyée immédiatement
 *    dans TOUS les cas, donc le temps de réponse ne dépend pas de l'existence du
 *    compte (voir F2 de la revue de sécurité).
 *  - Aucune donnée utilisateur renvoyée. verify_jwt=false (appel non authentifié).
 */

// Global fourni par le runtime Edge Supabase (absent en typage Deno standard).
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined

interface Body {
  email?: string
}

function neutral(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Résout l'utilisateur puis envoie l'email de reset. Ne lève jamais (best-effort). */
async function processReset(email: string): Promise<void> {
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: user } = await admin
      .from('users')
      .select('id, first_name, email, organization_id, is_active')
      .eq('email', email)
      .maybeSingle()
    const u = user as { id: string; first_name: string; email: string; organization_id: string; is_active: boolean } | null
    if (!u || !u.is_active) return

    // Jeton maison (reset, 1 h) — lien brandé, consommé uniquement à la soumission.
    const siteUrl = await resolveCabinetSiteUrl(admin, u.organization_id)
    const tokenRes = await createSetupToken(admin, { userId: u.id, purpose: 'reset', ttlHours: 1 })
    if ('error' in tokenRes) {
      console.warn('[request-password-reset] token:', tokenRes.error)
      return
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
  } catch (err) {
    console.error('[request-password-reset] processReset:', err instanceof Error ? err.message : err)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // On ne fait AUCUN travail dépendant de l'existence du compte sur le chemin de la
  // réponse : le body est lu, puis le traitement part en tâche de fond et on répond
  // neutre tout de suite → temps de réponse constant (anti-oracle temporel).
  const body = (await req.json().catch(() => ({}))) as Body
  const email = body.email?.trim().toLowerCase()
  if (email) {
    const work = processReset(email)
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(work)
    } else {
      // Repli hors runtime Edge (dev local) : on n'attend pas pour préserver le temps constant.
      void work
    }
  }
  return neutral()
})
