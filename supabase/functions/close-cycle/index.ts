// Edge function: close-cycle
// Clôture le cycle en cours d'une mission de supervision continue et ouvre
// automatiquement le cycle trimestriel suivant.
// Garde : seul le chef de mission ou l'associé peut déclencher.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ClosePayload {
  cycle_id: string
}

function nextQuarterPeriod(periodEnd: string): { start: string; end: string; label: string } {
  const end = new Date(periodEnd)
  // Le trimestre suivant commence le lendemain de period_end
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() + 1)

  const startMonth = start.getUTCMonth()
  const quarterStartMonth = startMonth - (startMonth % 3)
  const cycleStart = new Date(Date.UTC(start.getUTCFullYear(), quarterStartMonth, 1))
  const cycleEnd = new Date(Date.UTC(start.getUTCFullYear(), quarterStartMonth + 3, 0))
  const q = Math.floor(quarterStartMonth / 3) + 1

  return {
    start: cycleStart.toISOString().slice(0, 10),
    end: cycleEnd.toISOString().slice(0, 10),
    label: `Q${q} ${cycleStart.getUTCFullYear()}`,
  }
}

function weightOf(level: string | null | undefined): number | null {
  switch (level) {
    case 'c':  return 100
    case 'lc': return 75
    case 'pc': return 50
    case 'nc': return 0
    default:   return null
  }
}

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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !caller) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callerProfile } = await admin
      .from('users')
      .select('id')
      .eq('auth_id', caller.id)
      .single()
    if (!callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { cycle_id } = (await req.json()) as ClosePayload
    if (!cycle_id) {
      return new Response(
        JSON.stringify({ error: 'cycle_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Charger le cycle + mission
    const { data: cycle } = await admin
      .from('supervision_cycles')
      .select('id, mission_id, period_label, period_end, status')
      .eq('id', cycle_id)
      .single()
    if (!cycle) {
      return new Response(
        JSON.stringify({ error: 'Cycle introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (cycle.status === 'closed') {
      return new Response(
        JSON.stringify({ error: 'Ce cycle est déjà clôturé' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: mission } = await admin
      .from('missions')
      .select('id, kind, lead_auditor_id, associate_id')
      .eq('id', cycle.mission_id)
      .single()
    if (!mission) {
      return new Response(
        JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (mission.kind !== 'continuous_supervision') {
      return new Response(
        JSON.stringify({ error: 'Cette mission n\'est pas en supervision continue' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (mission.lead_auditor_id !== callerProfile.id && mission.associate_id !== callerProfile.id) {
      return new Response(
        JSON.stringify({ error: 'Seuls le chef de mission et l\'associé peuvent clôturer un cycle' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calcul du score du cycle (sur les assessments rattachés)
    const { data: assessments } = await admin
      .from('control_assessments')
      .select('id, conformity_level')
      .eq('cycle_id', cycle_id)

    const list = assessments ?? []
    let scoreSum = 0
    let scoreCount = 0
    let conformes = 0, partiels = 0, nonConformes = 0, nonApplicables = 0
    for (const a of list) {
      const w = weightOf(a.conformity_level as string | null)
      if (w !== null) { scoreSum += w; scoreCount += 1 }
      switch (a.conformity_level) {
        case 'c': conformes += 1; break
        case 'lc':
        case 'pc': partiels += 1; break
        case 'nc': nonConformes += 1; break
        case 'na': nonApplicables += 1; break
      }
    }

    // Compte des classifications via assessment_findings (modele findings-centric)
    let majorNc = 0, minorNc = 0, observations = 0
    const assessmentIds = list.map((a) => (a as { id: string }).id)
    if (assessmentIds.length > 0) {
      const { data: findingsRows } = await admin
        .from('assessment_findings')
        .select('classification')
        .in('assessment_id', assessmentIds)
      for (const f of (findingsRows ?? []) as Array<{ classification: string }>) {
        switch (f.classification) {
          case 'major_nc': majorNc += 1; break
          case 'minor_nc': minorNc += 1; break
          case 'observation': observations += 1; break
        }
      }
    }
    const score = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null
    const summary = {
      total: list.length,
      scored: scoreCount,
      conformes, partiels, non_conformes: nonConformes, non_applicables: nonApplicables,
      major_nc: majorNc, minor_nc: minorNc, observations,
    }

    // Clore le cycle courant
    const { error: closeErr } = await admin
      .from('supervision_cycles')
      .update({
        status: 'closed',
        score,
        conformity_summary: summary,
        closed_by: callerProfile.id,
        closed_at: new Date().toISOString(),
      })
      .eq('id', cycle_id)
    if (closeErr) {
      console.error('close-cycle close:', closeErr.message)
      return new Response(
        JSON.stringify({ error: 'Clôture du cycle impossible' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ouvrir automatiquement le cycle suivant (planned)
    const next = nextQuarterPeriod(cycle.period_end)
    const { data: nextCycle, error: nextErr } = await admin
      .from('supervision_cycles')
      .insert({
        mission_id: cycle.mission_id,
        period_label: next.label,
        period_start: next.start,
        period_end: next.end,
        status: 'planned',
        lead_auditor_id: mission.lead_auditor_id,
        created_by: callerProfile.id,
      })
      .select('id, period_label')
      .single()
    if (nextErr) {
      console.error('close-cycle next insert:', nextErr.message)
      // Non bloquant
    }

    return new Response(
      JSON.stringify({
        success: true,
        closed_cycle: { id: cycle_id, score, summary },
        next_cycle: nextCycle ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('close-cycle unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
