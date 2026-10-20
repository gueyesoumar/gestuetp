import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logActivity } from '../_shared/audit-log.ts'
import { hasCabinetPerm } from '../_shared/cabinet-permissions.ts'

// Gëstu Vendor (RFC 0020 Lot 1) : creation d'un tiers / fournisseur.
// Materialise le NOEUD organisation fournisseur (eager, reconcilie par n. d'immatriculation),
// pose l'ARETE 'supplier' (gestionnaire -> fournisseur) et le PROFIL d'arete (contexte de
// relation). Acte sensible reserve au service_role (aucune policy insert sur organizations /
// organization_relationships). Patron : create-client.

interface Payload {
  vendor_name: string
  registration_number?: string | null
  sector?: string | null
  country?: string | null
  website?: string | null
  phone?: string | null
  // profil d'arete
  services?: string | null
  data_access_level?: string | null
  criticality?: string | null
  contract_start?: string | null
  contract_end?: string | null
  internal_ref?: string | null
}

const DATA_ACCESS = new Set(['aucun', 'limite', 'etendu', 'critique'])
const CRITICALITY = new Set(['eleve', 'standard'])

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${base || 'fournisseur'}-${Date.now().toString(36)}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (b: unknown, s: number): Response =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // 1. Identite de l'appelant via JWT verifie.
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('x-auth-token')
    let callerId: string | null = null
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error } = await admin.auth.getUser(token)
      if (!error && user) callerId = user.id
    }
    if (!callerId) return json({ error: 'Non autorisé' }, 401)

    const { data: caller } = await admin.from('users').select('id, organization_id').eq('auth_id', callerId).single()
    if (!caller?.organization_id) return json({ error: 'Profil introuvable' }, 403)

    // 2. Permission.
    if (!(await hasCabinetPerm(admin, caller.id, 'can_manage_vendors'))) {
      return json({ error: 'Permission can_manage_vendors requise' }, 403)
    }

    // 3. Payload.
    const body = await req.json() as Payload
    const name = (body.vendor_name ?? '').trim()
    if (!name) return json({ error: 'Le nom du fournisseur est requis' }, 400)
    if (body.data_access_level && !DATA_ACCESS.has(body.data_access_level)) return json({ error: 'Niveau d\'accès invalide' }, 400)
    if (body.criticality && !CRITICALITY.has(body.criticality)) return json({ error: 'Criticité invalide' }, 400)
    const managerId = caller.organization_id
    const reg = (body.registration_number ?? '').trim()

    // 4. Reconciliation / creation du NOEUD fournisseur. Garde dure : un n. vide ne
    //    declenche JAMAIS de deduplication (sinon fusion de deux orgs distinctes).
    let vendorOrgId: string | null = null
    if (reg) {
      const { data: existing } = await admin.from('organizations').select('id').eq('registration_number', reg).limit(1)
      if (existing && existing.length > 0) vendorOrgId = existing[0].id
    }
    if (!vendorOrgId) {
      const { data: newOrg, error: orgErr } = await admin.from('organizations').insert({
        name, slug: slugify(name), types: ['supplier'],
        registration_number: reg || null, sector: body.sector ?? null,
        country: body.country ?? null, website: body.website ?? null, phone: body.phone ?? null,
      }).select('id').single()
      if (orgErr || !newOrg) { console.error('create-vendor org:', orgErr?.message); return json({ error: 'Création de l\'organisation fournisseur impossible' }, 500) }
      vendorOrgId = newOrg.id
    }

    if (managerId === vendorOrgId) return json({ error: 'Une organisation ne peut pas être son propre fournisseur' }, 400)

    // 5. Arete 'supplier' (idempotente via uq_org_rel_active).
    const { error: edgeErr } = await admin.from('organization_relationships')
      .insert({ actor_org_id: managerId, target_org_id: vendorOrgId, nature: 'supplier', status: 'active' })
    if (edgeErr && edgeErr.code !== '23505') { console.error('create-vendor edge:', edgeErr.message); return json({ error: 'Création du lien fournisseur impossible' }, 500) }
    const { data: edge } = await admin.from('organization_relationships').select('id')
      .eq('actor_org_id', managerId).eq('target_org_id', vendorOrgId).eq('nature', 'supplier').eq('status', 'active').limit(1).maybeSingle()
    if (!edge) return json({ error: 'Lien fournisseur introuvable' }, 500)

    // 6. Profil d'arete (contexte de relation).
    const { error: profErr } = await admin.from('vendor_relationship_profile').upsert({
      relationship_id: edge.id,
      services: body.services ?? null,
      data_access_level: body.data_access_level ?? 'aucun',
      criticality: body.criticality ?? 'standard',
      contract_start: body.contract_start ?? null,
      contract_end: body.contract_end ?? null,
      internal_ref: body.internal_ref ?? null,
      created_by: caller.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'relationship_id' })
    if (profErr) { console.error('create-vendor profile:', profErr.message) }

    await logActivity(admin, {
      organizationId: managerId, actorUserId: caller.id, action: 'vendor.created',
      targetType: 'vendor', targetId: edge.id, targetLabel: name,
    })

    return json({ ok: true, relationship_id: edge.id, vendor_org_id: vendorOrgId }, 200)
  } catch (err) {
    console.error('create-vendor:', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
