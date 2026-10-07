import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Verifier l'appelant
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('id, organization_id, is_active')
      .eq('auth_id', caller.id)
      .single()

    if (!callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Un compte désactivé conserve un JWT valide jusqu'à expiration : on refuse.
    if (!callerProfile.is_active) {
      return new Response(
        JSON.stringify({ error: 'Compte désactivé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parser le payload
    const { mission_id, evidence_catalog_ids } = await req.json() as {
      mission_id: string
      evidence_catalog_ids: string[]
    }

    if (!mission_id || !evidence_catalog_ids || evidence_catalog_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'mission_id et evidence_catalog_ids requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Verifier la mission
    const { data: mission } = await supabaseAdmin
      .from('missions')
      .select('id, cabinet_id')
      .eq('id', mission_id)
      .single()

    if (!mission) {
      return new Response(
        JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (mission.cabinet_id !== callerProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Accès interdit' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Résoudre la preuve canonique de chaque ligne catalogue pour dédupliquer :
    //    une seule demande par preuve mutualisée (evidence_item_id), en conservant
    //    une ligne catalogue REPRÉSENTATIVE (par contrôle) pour decline/escalate.
    const { data: catRows, error: catErr } = await supabaseAdmin
      .from('evidence_catalog')
      .select('id, evidence_item_id')
      .in('id', evidence_catalog_ids)

    if (catErr) {
      console.error('request-evidence catalog:', catErr.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la résolution des preuves' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Demandes canoniques : une par evidence_item_id (1re ligne catalogue = représentative).
    const canonicalByItem = new Map<string, string>()
    const legacyCatalogIds: string[] = []
    for (const row of (catRows ?? []) as { id: string; evidence_item_id: string | null }[]) {
      if (row.evidence_item_id) {
        if (!canonicalByItem.has(row.evidence_item_id)) canonicalByItem.set(row.evidence_item_id, row.id)
      } else {
        legacyCatalogIds.push(row.id)
      }
    }

    let count = 0

    if (canonicalByItem.size > 0) {
      const canonicalEntries = [...canonicalByItem.entries()].map(([itemId, repCatalogId]) => ({
        mission_id,
        evidence_catalog_id: repCatalogId,
        evidence_item_id: itemId,
        requested_by: callerProfile.id,
        status: 'pending',
      }))
      const { data: ins1, error: err1 } = await supabaseAdmin
        .from('mission_evidence_requests')
        .upsert(canonicalEntries, { onConflict: 'mission_id,evidence_item_id' })
        .select('id')
      if (err1) {
        console.error('request-evidence canonical insert:', err1.message)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la création des demandes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      count += ins1?.length ?? 0
    }

    if (legacyCatalogIds.length > 0) {
      const legacyEntries = legacyCatalogIds.map((ecId) => ({
        mission_id,
        evidence_catalog_id: ecId,
        requested_by: callerProfile.id,
        status: 'pending',
      }))
      const { data: ins2, error: err2 } = await supabaseAdmin
        .from('mission_evidence_requests')
        .upsert(legacyEntries, { onConflict: 'mission_id,evidence_catalog_id' })
        .select('id')
      if (err2) {
        console.error('request-evidence legacy insert:', err2.message)
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la création des demandes' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      count += ins2?.length ?? 0
    }

    return new Response(
      JSON.stringify({ success: true, count }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('request-evidence unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
