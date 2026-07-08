// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'

/**
 * probative-log — journal à valeur probante (Gëstu Regul / S1).
 *
 * Actions : append | verify
 *  - append : ajoute une entrée (le hash/seq/prev_hash sont calculés par le
 *    trigger base, autorité unique). Écriture service_role uniquement.
 *  - verify : rejoue la chaîne (verify_probative_chain) et renvoie l'intégrité.
 *
 * Gardes : appelant authentifié, staff régulateur (org de type group, jamais
 * un rôle client).
 */

interface Payload {
  action: 'append' | 'verify'
  action_type?: string
  subject_type?: string
  subject_id?: string
  data?: Record<string, unknown>
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const auth = await authenticateCaller(admin, req)
    if (!auth.ok) return json({ error: auth.message }, auth.status)
    const caller = auth.profile
    if (caller.role === 'client') return json({ error: 'Accès refusé' }, 403)

    const { data: callerOrg } = await admin
      .from('organizations').select('types').eq('id', caller.organization_id).single()
    if (!(Array.isArray(callerOrg?.types) && callerOrg!.types.includes('group'))) {
      return json({ error: "Votre organisation n'est pas un régulateur" }, 403)
    }

    const body = (await req.json()) as Payload

    if (body.action === 'verify') {
      const { data, error } = await admin.rpc('verify_probative_chain')
      if (error) {
        console.error('[probative-log] verify:', error.message)
        return json({ error: 'Vérification impossible' }, 500)
      }
      const row = Array.isArray(data) ? data[0] : data
      return json({ integrity: row ?? { ok: true, checked: 0, broken_seq: null } })
    }

    if (body.action === 'append') {
      if (!body.action_type) return json({ error: 'action_type requis' }, 400)
      const { data, error } = await admin
        .from('probative_log')
        .insert({
          actor_user_id: caller.id,
          action_type: body.action_type,
          subject_type: body.subject_type ?? null,
          subject_id: body.subject_id ?? null,
          payload: body.data ?? {},
        })
        .select('seq, occurred_at, action_type, subject_type, subject_id, hash, prev_hash')
        .single()
      if (error) {
        console.error('[probative-log] append:', error.message)
        return json({ error: "Impossible d'ajouter l'entrée" }, 500)
      }
      return json({ entry: data }, 201)
    }

    return json({ error: 'Action inconnue' }, 400)
  } catch (e) {
    console.error('[probative-log] unexpected:', e instanceof Error ? e.message : String(e))
    return json({ error: 'Erreur interne' }, 500)
  }
})
