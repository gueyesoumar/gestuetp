import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Renvoi d'une mission de la Revue interne vers les Travaux (RFC UX Lot 5).
// Remplace l'ancien UPDATE client direct : capture le motif (obligatoire) et
// l'enregistre dans mission_status_events, pour l'afficher ensuite à l'auditeur.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status: number): Response =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autorisé' }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
    if (authError || !caller) return json({ error: 'Non autorisé' }, 401)

    const { data: callerProfile } = await admin
      .from('users')
      .select('id, first_name, last_name, is_active')
      .eq('auth_id', caller.id)
      .single()
    if (!callerProfile || !callerProfile.is_active) return json({ error: 'Profil introuvable' }, 403)

    const { mission_id, reason } = await req.json() as { mission_id: string; reason: string }
    if (!mission_id) return json({ error: 'mission_id requis' }, 400)
    if (!reason || reason.trim().length === 0) {
      return json({ error: 'Un motif est obligatoire pour renvoyer en correction' }, 400)
    }

    const { data: mission } = await admin
      .from('missions')
      .select('id, cabinet_id, lead_auditor_id, associate_id, status')
      .eq('id', mission_id)
      .single()
    if (!mission) return json({ error: 'Mission introuvable' }, 404)
    if (mission.lead_auditor_id !== callerProfile.id && mission.associate_id !== callerProfile.id) {
      return json({ error: 'Accès interdit' }, 403)
    }
    if (mission.status !== 'internal_review') {
      return json({ error: "La mission n'est pas en revue interne" }, 400)
    }

    const { error: uErr } = await admin.from('missions').update({ status: 'fieldwork' }).eq('id', mission_id)
    if (uErr) {
      console.error('return-to-fieldwork update:', uErr.message)
      return json({ error: 'Erreur lors du renvoi' }, 500)
    }

    await admin.from('mission_status_events').insert({
      mission_id,
      organization_id: mission.cabinet_id,
      event_type: 'returned_to_fieldwork',
      actor_user_id: callerProfile.id,
      actor_label: `${callerProfile.first_name} ${callerProfile.last_name}`,
      reason: reason.trim(),
      from_status: 'internal_review',
      to_status: 'fieldwork',
    })

    return json({ success: true }, 200)
  } catch (err) {
    console.error('return-to-fieldwork unexpected:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
