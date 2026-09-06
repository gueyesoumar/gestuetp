import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logActivity } from '../_shared/audit-log.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

// P1a (RFC 0007) — Création EAGER d'un client.
// Avant : `cabinet_clients` était inséré côté client (fiche orpheline), et
// l'organisation n'était matérialisée que paresseusement au 1ᵉʳ lancement de
// mission (create-mission). Désormais l'organisation-nœud existe DÈS la création
// du client, et l'arête `audit_engagement` (cabinet → client) est posée
// immédiatement — le rôle « client » émerge du graphe sans attendre une mission.
//
// La création d'une organisation et l'écriture du graphe sont des actes sensibles
// réservés au service_role (aucune policy INSERT sur organizations /
// organization_relationships) : d'où cette Edge Function.

interface CreateClientPayload {
  client_name: string
  client_email_domain?: string | null
  client_registration_number?: string | null
  client_sector?: string | null
  client_address?: string | null
  client_city?: string | null
  client_country?: string | null
  client_website?: string | null
  client_phone?: string | null
  effectifs?: string | null
  chiffre_affaires?: string | null
  nombre_sites?: number | null
  activites_principales?: string | null
  structure_hierarchique?: string | null
  parties_interessees?: unknown[]
  exigences_reglementaires?: unknown[]
  notes?: string | null
}

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${base || 'client'}-${Date.now().toString(36)}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // 1. Identité de l'appelant — EXCLUSIVEMENT via le JWT vérifié (aucun fallback
    //    sur un header client : on tourne en service_role, plus aucune RLS derrière).
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('x-auth-token')
    let callerId: string | null = null
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
      if (!authError && user) callerId = user.id
    }
    if (!callerId) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 2. Profil appelant
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, organization_id')
      .eq('auth_id', callerId)
      .single()
    if (profileError || !callerProfile || !callerProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 2.bis Permission cabinet — can_manage_clients obligatoire (CRUD cabinet_clients).
    if (!(await hasCabinetPerm(supabaseAdmin, callerProfile.id, 'can_manage_clients'))) {
      return new Response(
        JSON.stringify({ error: 'Permission can_manage_clients requise' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 3. Payload
    const body: CreateClientPayload = await req.json()
    const clientName = (body.client_name ?? '').trim()
    if (!clientName) {
      return new Response(
        JSON.stringify({ error: 'Le nom du client est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    const cabinetId = callerProfile.organization_id
    const regNumber = (body.client_registration_number ?? '').trim()

    // 4. Réconciliation / création du NŒUD organisation.
    //    Garde dure (risque n°1 P1a) : un numéro d'immatriculation VIDE ne
    //    déclenche JAMAIS de déduplication — sinon deux organisations réelles
    //    distinctes fusionneraient (fuite inter-tenant). Sans n°, on crée toujours
    //    un nouveau nœud.
    let clientOrgId: string | null = null
    if (regNumber) {
      const { data: existing, error: dedupErr } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .contains('types', ['client'])
        .eq('registration_number', regNumber)
        .limit(1)
      if (dedupErr) {
        console.error('create-client dedup:', dedupErr.message)
        return new Response(
          JSON.stringify({ error: "Erreur lors de la résolution de l'organisation" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (existing && existing.length > 0) clientOrgId = existing[0].id
    }

    if (!clientOrgId) {
      // Identité durable positionnée sur le nœud (SPLIT §8.1). Le contexte de
      // mission (effectifs, exigences, parties…) reste sur la fiche en P1a et
      // migrera sur l'arête en P1b.
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: clientName,
          slug: slugify(clientName),
          types: ['client'],
          registration_number: regNumber || null,
          sector: body.client_sector ?? null,
          address: body.client_address ?? null,
          city: body.client_city ?? null,
          country: body.client_country ?? null,
          website: body.client_website ?? null,
          phone: body.client_phone ?? null,
        })
        .select('id')
        .single()
      if (orgError || !newOrg) {
        console.error('create-client create org:', orgError?.message)
        return new Response(
          JSON.stringify({ error: "Erreur lors de la création de l'organisation client" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      clientOrgId = newOrg.id
    }

    // 5. Fiche cabinet_clients (client_org_id renseigné dès maintenant).
    const { data: fiche, error: ficheError } = await supabaseAdmin
      .from('cabinet_clients')
      .insert({
        cabinet_id: cabinetId,
        client_org_id: clientOrgId,
        client_name: clientName,
        client_email_domain: body.client_email_domain ?? null,
        client_registration_number: regNumber || null,
        client_sector: body.client_sector ?? null,
        client_address: body.client_address ?? null,
        client_city: body.client_city ?? null,
        client_country: body.client_country ?? null,
        client_website: body.client_website ?? null,
        client_phone: body.client_phone ?? null,
        effectifs: body.effectifs ?? null,
        chiffre_affaires: body.chiffre_affaires ?? null,
        nombre_sites: body.nombre_sites ?? null,
        activites_principales: body.activites_principales ?? null,
        structure_hierarchique: body.structure_hierarchique ?? null,
        parties_interessees: body.parties_interessees ?? [],
        exigences_reglementaires: body.exigences_reglementaires ?? [],
        notes: body.notes ?? null,
      })
      .select('id')
      .single()
    if (ficheError || !fiche) {
      console.error('create-client insert fiche:', ficheError?.message)
      const isDup = ficheError?.code === '23505' || (ficheError?.message ?? '').includes('duplicate')
      return new Response(
        JSON.stringify({ error: isDup ? 'Ce client existe déjà dans votre portefeuille.' : 'Erreur lors de la création du client.' }),
        { status: isDup ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 6. Arête d'engagement (cabinet → client), une par paire. Idempotente :
    //    l'index unique uq_org_rel_active empêche les doublons ; une 23505 =
    //    l'arête existe déjà (ex. missions antérieures), on l'ignore. Le trigger
    //    sync_mission_engagement_edge (00213) réutilisera la même arête.
    let engagementId: string | null = null
    if (cabinetId !== clientOrgId) {
      const { error: edgeError } = await supabaseAdmin
        .from('organization_relationships')
        .insert({ actor_org_id: cabinetId, target_org_id: clientOrgId, nature: 'audit_engagement', status: 'active' })
      if (edgeError && edgeError.code !== '23505') {
        // Non bloquant pour la création du client : on journalise et on continue.
        console.error('create-client edge:', edgeError.message)
      }
      const { data: edge } = await supabaseAdmin
        .from('organization_relationships')
        .select('id')
        .eq('actor_org_id', cabinetId)
        .eq('target_org_id', clientOrgId)
        .eq('nature', 'audit_engagement')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      engagementId = edge?.id ?? null
    }

    // 6.bis Profil d'engagement (P1b) — contexte de mission porté par l'arête.
    //       Double-écriture : cabinet_clients reste le miroir lu jusqu'à P1c.
    //       Non bloquant pour la création du client.
    if (engagementId) {
      const { error: profileError } = await supabaseAdmin
        .from('engagement_profiles')
        .insert({
          engagement_id: engagementId,
          effectifs: body.effectifs ?? null,
          chiffre_affaires: body.chiffre_affaires ?? null,
          nombre_sites: body.nombre_sites ?? null,
          activites_principales: body.activites_principales ?? null,
          structure_hierarchique: body.structure_hierarchique ?? null,
          parties_interessees: body.parties_interessees ?? [],
          exigences_reglementaires: body.exigences_reglementaires ?? [],
          notes: body.notes ?? null,
        })
      if (profileError && profileError.code !== '23505') {
        console.error('create-client engagement_profile:', profileError.message)
      }
    }

    // 7. Piste d'audit (fail-open).
    await logActivity(supabaseAdmin, {
      organizationId: cabinetId,
      actorUserId: callerProfile.id,
      action: 'client.created',
      targetType: 'client',
      targetId: fiche.id,
      targetLabel: clientName,
    })

    return new Response(
      JSON.stringify({ ok: true, cabinet_client_id: fiche.id, client_org_id: clientOrgId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('create-client:', err instanceof Error ? err.message : err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
