import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logActivity } from '../_shared/audit-log.ts'

/**
 * Edge Function : seed-demo-data (E4 — bac à sable)
 *
 * Crée un espace de démonstration JETABLE, PAR UTILISATEUR (demo_owner_id).
 *  - variant 'guided'    : une fiche « Client Démo » + une mission de cadrage à
 *                          construire pas à pas (accompagné d'un tour).
 *  - variant 'prefilled' : un scénario RICHE — 3 missions à des stades variés,
 *                          évaluations réparties sur plusieurs dimensions (radar),
 *                          constats par gravité. Allume le score + les dashboards
 *                          via la « lentille » démo, côté propriétaire.
 *
 * Sécurité : force TOUJOURS is_demo=true + demo_owner_id=appelant, plafonné à un
 * seul jeu par utilisateur. Le contenu reste Comply (contrôles/constats) : on
 * n'injecte PAS de Risk/Policy, dont les tables sont rattachées à l'org RÉELLE du
 * cabinet et pollueraient le registre réel. is_demo n'est PAS une frontière de
 * sécurité — la donnée est cloisonnée par demo_owner_id et exclue des agrégats réels.
 */

interface SeedPayload {
  variant?: 'guided' | 'prefilled'
}

// Scénario nommé (fil rouge de la démo immersive) : un cabinet audite un client fictif.
const DEMO_CLIENT_NAME = 'Téranga Finances'

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function demoSlug(): string {
  return `client-demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function isoDate(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().slice(0, 10)
}

interface FindingSpec {
  classification: 'major_nc' | 'minor_nc' | 'observation' | 'strength'
  priority: 'critical' | 'high' | 'medium' | 'low' | null
  description: string
  risk: string | null
  recommendation: string | null
}

interface MissionSpec {
  namePrefix: string
  status: 'scoping' | 'fieldwork' | 'internal_review' | 'closure'
  // Fraction des contrôles ÉVALUÉS (0 = cadrage vide, 0.6 = terrain, 1 = clôture 100 %).
  coverage: number
  // Clôture : toutes les évaluations sont approuvées (prérequis de close-mission).
  allApproved: boolean
  startOffset: number
  endOffset: number
  findings: FindingSpec[]
  // Statuts des plans d'action (CAR) générés depuis les constats non conformes.
  carStatusPool: string[]
}

// Trois missions à des stades différents → étendue réaliste + radar renseigné.
const MISSION_SPECS: MissionSpec[] = [
  {
    namePrefix: 'Audit', status: 'closure', coverage: 1, allApproved: true,
    startOffset: -90, endOffset: -5,
    findings: [
      { classification: 'strength', priority: null,
        description: 'La revue des accès à privilèges est formalisée et tracée trimestriellement.',
        risk: null, recommendation: null },
      { classification: 'minor_nc', priority: 'medium',
        description: 'La politique de contrôle d’accès n’a pas été revue depuis plus de 12 mois.',
        risk: 'Des habilitations obsolètes peuvent subsister sans revue périodique.',
        recommendation: 'Planifier une revue trimestrielle des habilitations et tracer les validations.' },
    ],
    carStatusPool: ['verified', 'closed'],
  },
  {
    namePrefix: 'Contrôle', status: 'fieldwork', coverage: 0.6, allApproved: false,
    startOffset: -20, endOffset: 25,
    findings: [
      { classification: 'major_nc', priority: 'high',
        description: 'Aucune journalisation centralisée des accès aux systèmes sensibles.',
        risk: 'Une intrusion pourrait rester indétectable faute de traces exploitables.',
        recommendation: 'Déployer une collecte centralisée des journaux avec rétention et alertes.' },
      { classification: 'minor_nc', priority: 'low',
        description: 'Les sauvegardes ne font pas l’objet de tests de restauration documentés.',
        risk: 'La capacité de reprise après incident n’est pas démontrée.',
        recommendation: 'Instaurer un test de restauration semestriel avec compte rendu.' },
    ],
    carStatusPool: ['open', 'client_responded'],
  },
  {
    namePrefix: 'Audit', status: 'scoping', coverage: 0, allApproved: false,
    startOffset: 5, endOffset: 60, findings: [], carStatusPool: [],
  },
]

const EVIDENCE_NOTES = [
  'Procédure fournie et revue ; entretien réalisé avec le responsable.',
  'Capture de configuration et journal d’audit fournis.',
  'Politique validée par la direction, diffusion confirmée.',
  'Registre à jour ; échantillon de tickets contrôlé.',
]

const RISK_POOL = ['high', 'medium', 'medium', 'low', 'critical', 'medium', 'low', 'high']
const HOURS_POOL = [2, 4, 6, 8, 3, 5]

/**
 * Peuple une mission de façon COHÉRENTE avec son stade :
 *  - affectations (mission_control_assignments) sur TOUS les contrôles ;
 *  - planning (control_planning) avec un niveau de risque varié (colonne RISQUE) ;
 *  - évaluations : 100 % approuvées en clôture, mélange réaliste en terrain ;
 *  - chaîne de validations (assessment_validations) pour chaque évaluation approuvée ;
 *  - constats + plans d'action (CAR).
 * Best-effort — ne fait jamais échouer le seed. Renvoie les contrôles évalués
 * (id + dimension) pour le registre de risques.
 */
// deno-lint-ignore no-explicit-any
async function seedMission(admin: any, missionId: string, frameworkId: string, ownerId: string, spec: MissionSpec): Promise<Array<{ id: string; dimension: string | null }>> {
  try {
    if (spec.coverage <= 0) return [] // cadrage : rien à peupler (état initial)

    const { data: domains } = await admin.from('domains').select('id').eq('framework_id', frameworkId)
    const domainIds = ((domains ?? []) as Array<{ id: string }>).map((d) => d.id)
    if (domainIds.length === 0) return []

    // TOUS les contrôles du référentiel (pas de limite) : le programme de travail
    // complet est affecté + planifié dès que la mission a démarré.
    const { data: ctrls } = await admin
      .from('controls').select('id, dimension, domain_id').in('domain_id', domainIds)
    const controls = ((ctrls ?? []) as Array<{ id: string; dimension: string | null; domain_id: string }>)
    if (controls.length === 0) return []
    const dimById = new Map(controls.map((c) => [c.id, c.dimension]))
    const allIds = controls.map((c) => c.id)

    // Affectations : tout le programme est affecté au chef de mission.
    await admin.from('mission_control_assignments').upsert(
      allIds.map((cid) => ({ mission_id: missionId, control_id: cid, auditor_id: ownerId })),
      { onConflict: 'mission_id,control_id' },
    )

    // Planning : niveau de risque varié (sinon la colonne RISQUE affiche « Moyen »
    // par défaut) + charge estimée.
    await admin.from('control_planning').upsert(
      allIds.map((cid, idx) => ({
        mission_id: missionId, control_id: cid,
        risk_level: RISK_POOL[idx % RISK_POOL.length],
        estimated_hours: HOURS_POOL[idx % HOURS_POOL.length],
      })),
      { onConflict: 'mission_id,control_id' },
    )

    // Couverture des ÉVALUATIONS : round-robin par domaine pour étaler la progression.
    const byDomain = new Map<string, string[]>()
    for (const c of controls) { const a = byDomain.get(c.domain_id) ?? []; a.push(c.id); byDomain.set(c.domain_id, a) }
    const targetCount = Math.max(1, Math.round(controls.length * spec.coverage))
    const covered: string[] = []
    const buckets = [...byDomain.values()]
    let bi = 0
    while (covered.length < targetCount && buckets.some((b) => b.length > 0)) {
      const b = buckets[bi % buckets.length]
      const id = b.shift()
      if (id) covered.push(id)
      bi++
    }

    // Statut + conformité par évaluation. Clôture : tout approuvé. Terrain : mélange
    // réaliste (approuvé / en revue / soumis / brouillon-en-cours).
    const rows = covered.map((cid, idx) => {
      let status: string, conformity: string, withEvidence: boolean
      if (spec.allApproved) {
        status = 'approved'
        conformity = idx % 6 === 0 ? 'pc' : idx % 3 === 0 ? 'lc' : 'c'
        withEvidence = true
      } else {
        const m = idx % 20
        if (m < 9) { status = 'approved'; conformity = idx % 3 === 0 ? 'lc' : 'c'; withEvidence = true }
        else if (m < 14) { status = 'in_review'; conformity = 'pc'; withEvidence = true }
        else if (m < 17) { status = 'submitted'; conformity = 'lc'; withEvidence = true }
        else { status = 'draft'; conformity = 'pc'; withEvidence = true } // draft + notes → « En cours »
      }
      return {
        mission_id: missionId, control_id: cid, auditor_id: ownerId,
        status, conformity_level: conformity,
        evidence_notes: withEvidence ? EVIDENCE_NOTES[idx % EVIDENCE_NOTES.length] : null,
      }
    })

    const { data: inserted } = await admin
      .from('control_assessments')
      .upsert(rows, { onConflict: 'mission_id,control_id' })
      .select('id, status')
    const insertedRows = (inserted ?? []) as Array<{ id: string; status: string }>
    const approvedIds = insertedRows.filter((a) => a.status === 'approved').map((a) => a.id)

    // Chaîne de validations pour chaque évaluation approuvée (onglet Validation).
    if (approvedIds.length > 0) {
      const stages: string[] = ['auditor_submitted', 'lead_review', 'associate_review']
      if (spec.status === 'closure') stages.push('client_review')
      const valRows = approvedIds.flatMap((aid) =>
        stages.map((stage) => ({ assessment_id: aid, stage, decision: 'approved', validated_by: ownerId })),
      )
      await admin.from('assessment_validations').insert(valRows)
    }

    // Constats sur les premières évaluations approuvées.
    if (approvedIds.length > 0 && spec.findings.length > 0) {
      const findingRows = spec.findings.slice(0, approvedIds.length).map((f, idx) => ({
        assessment_id: approvedIds[idx],
        ord: 0,
        classification: f.classification,
        description: f.description,
        risk: f.risk,
        recommendation: f.recommendation,
        priority: f.priority,
      }))
      await admin.from('assessment_findings').insert(findingRows)

      // Plans d'action correctifs (CAR) issus des constats non conformes (hors point fort).
      const carSources = spec.findings
        .map((f, idx) => ({ f, aid: approvedIds[idx] }))
        .filter((x) => x.aid && (x.f.classification === 'major_nc' || x.f.classification === 'minor_nc' || x.f.classification === 'observation'))
      if (carSources.length > 0 && spec.carStatusPool.length > 0) {
        const carRows = carSources.map((x, idx) => ({
          mission_id: missionId,
          assessment_id: x.aid,
          code: `CAR-${String(idx + 1).padStart(3, '0')}`,
          finding_classification: x.f.classification,
          description: x.f.recommendation ?? x.f.description,
          deadline: isoDate(30),
          status: spec.carStatusPool[idx % spec.carStatusPool.length],
          created_by: ownerId,
        }))
        await admin.from('corrective_action_requests').insert(carRows)
      }
    }

    return covered.map((id) => ({ id, dimension: dimById.get(id) ?? null }))
  } catch (err) {
    console.warn('[seed-demo-data] seedMission:', err instanceof Error ? err.message : err)
    return []
  }
}

/**
 * Contact client + entretien de démo pour une mission (onglet Entretiens + partie
 * planification). Rattachés à la mission → nettoyés en cascade.
 */
// deno-lint-ignore no-explicit-any
async function seedInterview(admin: any, missionId: string, ownerId: string, completed: boolean): Promise<void> {
  try {
    const { data: contact } = await admin.from('client_contacts').insert({
      mission_id: missionId, name: 'Awa Diallo', job_title: 'RSSI', department: 'Sécurité des SI',
      email: 'awa.diallo@teranga-finances.sn', is_primary: true,
    }).select('id').single()
    const contactId = (contact as { id: string } | null)?.id
    if (!contactId) return
    await admin.from('interview_schedules').insert({
      mission_id: missionId, contact_id: contactId, auditor_id: ownerId,
      title: 'Entretien de cadrage — RSSI', scheduled_date: isoDate(completed ? -30 : 3),
      duration_minutes: 60, location: 'Visioconférence',
      status: completed ? 'completed' : 'scheduled',
    })
  } catch (err) {
    console.warn('[seed-demo-data] seedInterview:', err instanceof Error ? err.message : err)
  }
}

/**
 * Registre de risques de démo (Gëstu Risk) : 2 scénarios rattachés au cabinet,
 * marqués is_demo + demo_owner_id (migration 00239) — exclus du registre/score
 * réels, inclus sous la lentille. Chaque scénario est maîtrisé par une barrière
 * (contrôle réellement évalué), pour un radar renseigné côté propriétaire.
 */
// deno-lint-ignore no-explicit-any
async function seedRisk(admin: any, cabinetId: string, ownerId: string, missionId: string, controls: Array<{ id: string; dimension: string | null }>): Promise<void> {
  try {
    const withDim = controls.filter((c) => c.dimension)
    if (withDim.length === 0) return
    // Deux dimensions distinctes si possible.
    const seen = new Set<string>()
    const chosen: Array<{ id: string; dimension: string }> = []
    for (const c of withDim) {
      const dim = c.dimension as string
      if (!seen.has(dim)) { seen.add(dim); chosen.push({ id: c.id, dimension: dim }) }
      if (chosen.length === 2) break
    }
    if (chosen.length === 0) return

    const SCENARIOS = [
      { title: 'Intrusion non détectée sur les systèmes sensibles', vuln: 'Journalisation partielle des accès.', l: 3, i: 4, kind: 'detective' as const },
      { title: 'Indisponibilité prolongée après incident', vuln: 'Restaurations non testées.', l: 2, i: 3, kind: 'corrective' as const },
    ]
    for (let idx = 0; idx < chosen.length; idx++) {
      const c = chosen[idx]
      const s = SCENARIOS[idx % SCENARIOS.length]
      const { data: scenario } = await admin.from('risk_scenarios').insert({
        organization_id: cabinetId,
        title: s.title,
        description: 'Scénario de démonstration (bac à sable).',
        dimension: c.dimension,
        vulnerability: s.vuln,
        inherent_likelihood: s.l,
        inherent_impact: s.i,
        treatment: 'reduce',
        treatment_status: idx === 0 ? 'in_progress' : 'open',
        source_mission_id: missionId,
        is_demo: true,
        demo_owner_id: ownerId,
        created_by: ownerId,
      }).select('id').single()
      const scenarioId = (scenario as { id: string } | null)?.id
      if (scenarioId) {
        await admin.from('risk_control_links').insert({
          organization_id: cabinetId,
          risk_scenario_id: scenarioId,
          control_id: c.id,
          kind: s.kind,
        })
      }
    }
  } catch (err) {
    console.warn('[seed-demo-data] seedRisk:', err instanceof Error ? err.message : err)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Appelant via JWT vérifié uniquement.
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non autorisé' }, 401)
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !caller) return json({ error: 'Non autorisé' }, 401)

    const { data: profile, error: profileError } = await admin
      .from('users').select('id, organization_id').eq('auth_id', caller.id).single()
    if (profileError || !profile?.organization_id) return json({ error: 'Profil introuvable' }, 403)
    const cabinetId = (profile as { id: string; organization_id: string }).organization_id
    const ownerId = (profile as { id: string }).id

    const body = (await req.json().catch(() => ({}))) as SeedPayload
    const variant = body.variant === 'prefilled' ? 'prefilled' : 'guided'

    // 2. Plafond : un seul bac à sable par utilisateur — on renvoie l'existant.
    const { data: existing } = await admin
      .from('cabinet_clients')
      .select('id')
      .eq('cabinet_id', cabinetId).eq('is_demo', true).eq('demo_owner_id', ownerId)
      .maybeSingle()
    if (existing) {
      return json({ ok: true, already: true, cabinet_client_id: (existing as { id: string }).id })
    }

    // 3. Nœud organisation de démo (type client).
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .insert({ name: DEMO_CLIENT_NAME, slug: demoSlug(), types: ['client'] })
      .select('id').single()
    if (orgError || !org) {
      console.error('[seed-demo-data] org:', orgError?.message)
      return json({ error: 'Création de la démo impossible' }, 500)
    }
    const clientOrgId = (org as { id: string }).id

    // 4. Fiche client de démo (marquée is_demo + propriétaire).
    const { data: fiche, error: ficheError } = await admin
      .from('cabinet_clients')
      .insert({ cabinet_id: cabinetId, client_org_id: clientOrgId, is_demo: true, demo_owner_id: ownerId })
      .select('id').single()
    if (ficheError || !fiche) {
      console.error('[seed-demo-data] fiche:', ficheError?.message)
      await admin.from('organizations').delete().eq('id', clientOrgId)
      return json({ error: 'Création de la démo impossible' }, 500)
    }
    const ficheId = (fiche as { id: string }).id

    // 5. Missions de démo. Variante 'guided' : une seule mission de cadrage (à
    //    construire, accompagné par le tour). Variante 'prefilled' : les 3 stades.
    const specs = variant === 'prefilled' ? MISSION_SPECS : [MISSION_SPECS[2]]
    const missionIds: string[] = []
    let riskControls: Array<{ id: string; dimension: string | null }> = []
    let riskMissionId: string | null = null

    // Référentiels actifs triés par TAILLE croissante : la mission clôturée (spec 0)
    // prend le plus COURT pour être évaluée à 100 % sans volumétrie démesurée.
    const { data: fwsRaw } = await admin.from('frameworks').select('id, name').eq('is_active', true)
    const withCounts: Array<{ id: string; name: string; count: number }> = []
    for (const fw of ((fwsRaw ?? []) as Array<{ id: string; name: string }>)) {
      const { data: doms } = await admin.from('domains').select('id').eq('framework_id', fw.id)
      const dIds = ((doms ?? []) as Array<{ id: string }>).map((d) => d.id)
      let count = 0
      if (dIds.length > 0) {
        const { count: c } = await admin.from('controls').select('id', { count: 'exact', head: true }).in('domain_id', dIds)
        count = c ?? 0
      }
      if (count > 0) withCounts.push({ ...fw, count })
    }
    withCounts.sort((a, b) => a.count - b.count)
    const frameworks = withCounts

    if (frameworks.length > 0) {
      for (let idx = 0; idx < specs.length; idx++) {
        const spec = specs[idx]
        const fw = frameworks[idx % frameworks.length]
        // deno-lint-ignore no-explicit-any
        const { data: newMissionId, error: txError } = await (admin.rpc as any)('create_mission_tx', {
          p_cabinet_id: cabinetId,
          p_client_id: clientOrgId,
          p_framework_id: fw.id,
          p_name: `${spec.namePrefix} ${fw.name} — Démo`,
          p_description: 'Mission de démonstration (bac à sable).',
          p_kind: 'audit',
          p_lead_auditor_id: ownerId,
          p_associate_id: null,
          p_start_date: isoDate(spec.startOffset),
          p_end_date: isoDate(spec.endOffset),
          p_member_ids: [ownerId],
          p_excluded_control_ids: [],
          p_created_by: ownerId,
        })
        if (txError || !newMissionId) {
          console.warn('[seed-demo-data] create_mission_tx:', txError?.message ?? 'no id')
          continue
        }
        const missionId = newMissionId as string
        missionIds.push(missionId)
        // deno-lint-ignore no-explicit-any
        await (admin.from('missions') as any)
          .update({ is_demo: true, demo_owner_id: ownerId, status: spec.status })
          .eq('id', missionId)
        const picked = await seedMission(admin, missionId, fw.id, ownerId, spec)
        // Le registre de risques s'appuie sur la 1re mission peuplée (contrôles évalués).
        if (picked.length > 0 && riskControls.length === 0) { riskControls = picked; riskMissionId = missionId }

        // Entretien de démo (terrain + clôture).
        if (spec.status === 'fieldwork' || spec.status === 'closure') {
          await seedInterview(admin, missionId, ownerId, spec.status === 'closure')
        }
        // Rapport généré (clôture) — file_path null : le PDF est régénéré côté client.
        if (spec.status === 'closure') {
          await admin.from('reports').insert({
            mission_id: missionId, format: 'pdf', status: 'ready', version: 1,
            file_path: null, generated_by: ownerId,
          })
        }

        // Activité récente (piste d'audit) rattachée à la mission → panneau « Activité récente ».
        const missionName = `${spec.namePrefix} ${fw.name} — Démo`
        await logActivity(admin, {
          organizationId: cabinetId, actorUserId: ownerId,
          action: 'mission.created', targetType: 'mission', targetId: missionId,
          targetLabel: missionName, summary: `Mission créée : ${missionName}`,
        })
        if (spec.status === 'closure') {
          await logActivity(admin, {
            organizationId: cabinetId, actorUserId: ownerId,
            action: 'mission.closed', targetType: 'mission', targetId: missionId,
            targetLabel: missionName, summary: 'Mission clôturée et rapport généré.',
          })
        }
      }
    }

    // Registre de risques de démo (variante riche uniquement).
    if (variant === 'prefilled' && riskControls.length > 0 && riskMissionId) {
      await seedRisk(admin, cabinetId, ownerId, riskMissionId, riskControls)
    }

    // Les insertions de mission créent des arêtes d'engagement (trigger). On les
    // retire : le bac à sable ne doit pas apparaître comme tuile client du Hub.
    await admin
      .from('organization_relationships')
      .delete()
      .eq('actor_org_id', cabinetId)
      .eq('target_org_id', clientOrgId)
      .eq('nature', 'audit_engagement')

    await logActivity(admin, {
      organizationId: cabinetId, actorUserId: ownerId,
      action: 'demo.seeded', targetType: 'client', targetId: ficheId, targetLabel: DEMO_CLIENT_NAME,
      summary: `Bac à sable créé (${variant}, ${missionIds.length} mission${missionIds.length > 1 ? 's' : ''})`,
    })

    return json({ ok: true, cabinet_client_id: ficheId, client_org_id: clientOrgId, mission_ids: missionIds, variant })
  } catch (err) {
    console.error('[seed-demo-data]', err instanceof Error ? err.message : err)
    return json({ error: 'Erreur interne' }, 500)
  }
})
