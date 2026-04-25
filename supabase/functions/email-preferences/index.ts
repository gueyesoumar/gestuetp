import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function : email-preferences
 *
 * Gère la lecture et la mise à jour des préférences email d'un utilisateur,
 * sans nécessiter d'authentification, via le token de désabonnement.
 *
 * Le token est un secret partagé par lien email — sa connaissance fait foi.
 * Le service-role bypass RLS pour lire/écrire `email_preferences`.
 *
 * Actions :
 *   - { action: 'get', token }     → renvoie l'état des deux toggles + email masqué
 *   - { action: 'update', token, reminders_enabled, digest_enabled }
 *                                   → applique les changements
 */

interface GetBody { action: 'get'; token: string }
interface UpdateBody { action: 'update'; token: string; reminders_enabled?: boolean; digest_enabled?: boolean }
type Body = GetBody | UpdateBody

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json() as Body
    if (!body.token || typeof body.token !== 'string' || body.token.length < 16) {
      return jsonResponse({ error: 'Token invalide' }, 400)
    }

    if (body.action === 'get') {
      const { data, error } = await admin
        .from('email_preferences')
        .select('reminders_enabled, digest_enabled, user_id, users:users(email)')
        .eq('unsubscribe_token', body.token)
        .maybeSingle()

      if (error) {
        console.error('[email-preferences] get error:', error.message)
        return jsonResponse({ error: 'Erreur serveur' }, 500)
      }
      if (!data) {
        return jsonResponse({ error: 'Lien invalide ou expiré' }, 404)
      }

      const row = data as unknown as {
        reminders_enabled: boolean
        digest_enabled: boolean
        users: { email: string } | null
      }
      return jsonResponse({
        reminders_enabled: row.reminders_enabled,
        digest_enabled: row.digest_enabled,
        email_masked: maskEmail(row.users?.email ?? ''),
      })
    }

    if (body.action === 'update') {
      const updates: Record<string, boolean> = {}
      if (typeof body.reminders_enabled === 'boolean') updates.reminders_enabled = body.reminders_enabled
      if (typeof body.digest_enabled === 'boolean') updates.digest_enabled = body.digest_enabled
      if (Object.keys(updates).length === 0) {
        return jsonResponse({ error: 'Aucune mise à jour demandée' }, 400)
      }

      const { data, error } = await admin
        .from('email_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('unsubscribe_token', body.token)
        .select('reminders_enabled, digest_enabled')
        .maybeSingle()

      if (error) {
        console.error('[email-preferences] update error:', error.message)
        return jsonResponse({ error: 'Erreur serveur' }, 500)
      }
      if (!data) {
        return jsonResponse({ error: 'Lien invalide ou expiré' }, 404)
      }

      return jsonResponse(data)
    }

    return jsonResponse({ error: 'Action inconnue' }, 400)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[email-preferences] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return ''
  const visible = local.slice(0, 2)
  return `${visible}${'•'.repeat(Math.max(local.length - 2, 1))}@${domain}`
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
