import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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
      .select('id')
      .eq('auth_id', caller.id)
      .single()

    if (!callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Profil introuvable' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { mission_id } = await req.json()
    if (!mission_id) {
      return new Response(
        JSON.stringify({ error: 'mission_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Charger la mission
    const { data: mission } = await supabaseAdmin
      .from('missions')
      .select('id, lead_auditor_id, associate_id, framework_id')
      .eq('id', mission_id)
      .single()

    if (!mission) {
      return new Response(
        JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Seul l'associé ou le chef de mission peut clôturer
    if (mission.lead_auditor_id !== callerProfile.id && mission.associate_id !== callerProfile.id) {
      return new Response(
        JSON.stringify({ error: 'Seuls le chef de mission et l\'associé peuvent clôturer' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Charger tous les assessments pour le scoring
    const { data: assessments } = await supabaseAdmin
      .from('control_assessments')
      .select('id, status, control_id')
      .eq('mission_id', mission_id)

    const total = assessments?.length ?? 0
    const approved = assessments?.filter((a) => a.status === 'approved').length ?? 0
    const rejected = assessments?.filter((a) => a.status === 'rejected').length ?? 0
    const pending = total - approved - rejected

    // Calculer le score de conformité (pourcentage de contrôles approuvés)
    const conformityScore = total > 0 ? Math.round((approved / total) * 100) : 0

    // Charger les domaines pour le scoring par domaine
    const { data: domains } = await supabaseAdmin
      .from('domains')
      .select('id, code, name')
      .eq('framework_id', mission.framework_id)
      .order('sort_order')

    const { data: controls } = await supabaseAdmin
      .from('controls')
      .select('id, domain_id')
      .in('domain_id', (domains ?? []).map((d) => d.id))

    const controlDomainMap = new Map((controls ?? []).map((c) => [c.id, c.domain_id]))
    const assessmentMap = new Map((assessments ?? []).map((a) => [a.control_id, a.status]))

    const domainScores = (domains ?? []).map((domain) => {
      const domainControls = (controls ?? []).filter((c) => c.domain_id === domain.id)
      const domainTotal = domainControls.length
      const domainApproved = domainControls.filter((c) => assessmentMap.get(c.id) === 'approved').length
      const score = domainTotal > 0 ? Math.round((domainApproved / domainTotal) * 100) : 0
      return {
        domain_code: domain.code,
        domain_name: domain.name,
        total: domainTotal,
        approved: domainApproved,
        score,
      }
    })

    // Créer le rapport
    const reportData = {
      conformity_score: conformityScore,
      total_controls: total,
      approved_controls: approved,
      rejected_controls: rejected,
      pending_controls: pending,
      domain_scores: domainScores,
      closed_at: new Date().toISOString(),
      closed_by: callerProfile.id,
    }

    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .insert({
        mission_id,
        format: 'pdf',
        status: 'ready',
        version: 1,
        file_path: null,
        generated_by: callerProfile.id,
      })
      .select('id')
      .single()

    if (reportError) {
      console.error('close-mission report:', reportError.message)
    }

    // Clôturer la mission
    const { error: closeError } = await supabaseAdmin
      .from('missions')
      .update({ status: 'closure' })
      .eq('id', mission_id)

    if (closeError) {
      console.error('close-mission update:', closeError.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la clôture' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report?.id ?? null,
        scoring: reportData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('close-mission unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
