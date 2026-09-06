import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logActivity } from '../_shared/audit-log.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

// P1b (RFC 0007) — mise à jour d'un client.
// Écrit la fiche cabinet_clients (miroir lu jusqu'à P1c) ET le profil d'engagement
// (engagement_profiles, source de vérité du contexte de mission). Passe par le
// service_role : en P1c cabinet_clients deviendra une vue non directement modifiable
// et l'écriture du profil doit rester serveur. Remplace le PATCH REST direct.

// Champs de CONTEXTE (miroir dans engagement_profiles). L'identité (client_name,
// secteur, adresse…) et le branding restent hors profil (→ nœud en P1c).
const CONTEXT_FIELDS = [
  'effectifs', 'chiffre_affaires', 'nombre_sites', 'activites_principales',
  'structure_hierarchique', 'parties_interessees', 'exigences_reglementaires',
  'it_environment', 'it_systems', 'notes',
] as const

// Colonnes réellement modifiables de la fiche (liste blanche : jamais id/cabinet_id/
// client_org_id/timestamps, pour empêcher un déplacement de tenant).
const FICHE_FIELDS = [
  'client_name', 'client_email_domain', 'client_registration_number', 'client_sector',
  'client_address', 'client_city', 'client_country', 'client_website', 'client_phone',
  'logo_url', 'brand_primary_color', 'brand_secondary_color', 'brand_accent_color', 'brand_font',
  ...CONTEXT_FIELDS,
] as const

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

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
    if (!(await hasCabinetPerm(supabaseAdmin, callerProfile.id, 'can_manage_clients'))) {
      return new Response(
        JSON.stringify({ error: 'Permission can_manage_clients requise' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const body = await req.json() as { id?: string } & Record<string, unknown>
    const ficheId = body.id
    if (!ficheId) {
      return new Response(
        JSON.stringify({ error: 'Identifiant client manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Cloisonnement : la fiche doit appartenir au cabinet de l'appelant.
    const { data: fiche, error: ficheErr } = await supabaseAdmin
      .from('cabinet_clients')
      .select('id, cabinet_id, client_org_id, client_name')
      .eq('id', ficheId)
      .single()
    if (ficheErr || !fiche) {
      return new Response(
        JSON.stringify({ error: 'Client introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }
    if (fiche.cabinet_id !== callerProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Accès interdit à ce client' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 1. Mise à jour de la fiche (liste blanche des colonnes présentes au payload).
    const ficheUpdate: Record<string, unknown> = {}
    for (const k of FICHE_FIELDS) {
      if (k in body) ficheUpdate[k] = body[k]
    }
    if (Object.keys(ficheUpdate).length > 0) {
      const { error: updErr } = await supabaseAdmin
        .from('cabinet_clients')
        .update(ficheUpdate)
        .eq('id', ficheId)
      if (updErr) {
        console.error('update-client fiche:', updErr.message)
        const isDup = updErr.code === '23505' || (updErr.message ?? '').includes('duplicate')
        return new Response(
          JSON.stringify({ error: isDup ? 'Ce client existe déjà dans votre portefeuille.' : 'Impossible de mettre à jour le client.' }),
          { status: isDup ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    // 2. Miroir du contexte dans engagement_profiles (source de vérité P1b).
    //    Upsert sur l'arête d'engagement (une par paire). Ne touche que les champs
    //    de contexte présents au payload (ne nulle pas ceux absents).
    const contextUpdate: Record<string, unknown> = {}
    for (const k of CONTEXT_FIELDS) {
      if (k in body) contextUpdate[k] = body[k]
    }
    if (Object.keys(contextUpdate).length > 0 && fiche.client_org_id && fiche.cabinet_id !== fiche.client_org_id) {
      const { data: edge } = await supabaseAdmin
        .from('organization_relationships')
        .select('id')
        .eq('actor_org_id', fiche.cabinet_id)
        .eq('target_org_id', fiche.client_org_id)
        .eq('nature', 'audit_engagement')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
      if (edge?.id) {
        // Upsert : crée le profil s'il manque (arête née hors create-client), sinon MAJ.
        const { error: profErr } = await supabaseAdmin
          .from('engagement_profiles')
          .upsert({ engagement_id: edge.id, ...contextUpdate }, { onConflict: 'engagement_id' })
        if (profErr) console.error('update-client engagement_profile:', profErr.message)
      }
    }

    await logActivity(supabaseAdmin, {
      organizationId: fiche.cabinet_id,
      actorUserId: callerProfile.id,
      action: 'client.updated',
      targetType: 'client',
      targetId: fiche.id,
      targetLabel: (body.client_name as string) ?? fiche.client_name,
    })

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('update-client:', err instanceof Error ? err.message : err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
