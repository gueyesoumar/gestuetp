import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { setUserPassword } from '../_shared/set-user-password.ts'

/**
 * Edge Function : set-password
 *
 * Point de passage pour poser/changer le mot de passe de SON PROPRE compte
 * (session standard ou recovery en AAL1). Valide contre la politique plateforme
 * (longueur, complexité, interdits, HIBP, historique) via le helper partagé
 * setUserPassword, puis pose via service_role.
 */

function json(data: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim()
    if (!token) return json({ error: 'Non autorisé' }, 401)

    const { data: { user }, error: authError } = await admin.auth.getUser(token)
    if (authError || !user) return json({ error: 'Non autorisé' }, 401)

    const body = await req.json().catch(() => null) as { password?: string } | null
    const password = body?.password
    if (!password || typeof password !== 'string') return json({ error: 'Mot de passe requis' }, 400)

    const { data: profile } = await admin.from('users').select('id').eq('auth_id', user.id).single()
    const profileId = (profile as { id: string } | null)?.id ?? null

    const res = await setUserPassword(admin, user.id, profileId, password)
    if (!res.ok) return json({ error: res.error ?? 'Mot de passe refusé', rules: res.rules ?? [] }, res.status ?? 400)

    return json({ ok: true }, 200)
  } catch (err) {
    console.error('[set-password] error:', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
