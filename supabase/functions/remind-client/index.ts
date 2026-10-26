import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { notifyMany } from '../_shared/notify.ts'

// Relance des utilisateurs clients d'une mission (RFC n°17 Lot 3). Remplace l'insert
// REST côté client qui était bloqué par la RLS (pas de policy INSERT pour authenticated).
// L'appelant doit être chef de mission ou associé ; l'insert passe par service_role.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (b: unknown, status: number): Response =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autorisé' }, 401)

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(token)
    if (authError || !caller) return json({ error: 'Non autorisé' }, 401)

    const { data: callerProfile } = await admin
      .from('users').select('id, organization_id, is_active').eq('auth_id', caller.id).single()
    if (!callerProfile || !callerProfile.is_active) return json({ error: 'Profil introuvable' }, 403)

    const { mission_id, questPending, pendingDocs } = await req.json() as {
      mission_id: string; questPending?: number; pendingDocs?: number
    }
    if (!mission_id) return json({ error: 'mission_id requis' }, 400)

    const { data: mission } = await admin
      .from('missions').select('id, name, cabinet_id, client_id, lead_auditor_id, associate_id').eq('id', mission_id).single()
    if (!mission || mission.cabinet_id !== callerProfile.organization_id) return json({ error: 'Accès interdit' }, 403)
    if (mission.lead_auditor_id !== callerProfile.id && mission.associate_id !== callerProfile.id) {
      return json({ error: 'Seuls le chef de mission et l\'associé peuvent relancer le client' }, 403)
    }
    if (!mission.client_id) return json({ error: 'Cette mission n\'a pas de client à relancer' }, 400)

    const { data: clientUsers } = await admin
      .from('users').select('id').eq('organization_id', mission.client_id).eq('is_active', true)
    const ids = ((clientUsers ?? []) as { id: string }[]).map((u) => u.id)
    if (ids.length === 0) return json({ success: true, count: 0 }, 200)

    const qp = typeof questPending === 'number' && questPending > 0 ? `${questPending} question(s) du questionnaire en attente` : null
    const pd = typeof pendingDocs === 'number' && pendingDocs > 0 ? `${pendingDocs} document(s) en attente` : null
    const body = [qp, pd].filter(Boolean).join('. ') || 'Merci de compléter les éléments de cadrage.'

    await notifyMany(admin, ids, {
      type: 'invitation',
      title: `Rappel : mission ${mission.name}`,
      body,
      link: `/client/missions/${mission_id}`,
      metadata: { mission_id },
    })

    return json({ success: true, count: ids.length }, 200)
  } catch (err) {
    console.error('remind-client unexpected:', err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
