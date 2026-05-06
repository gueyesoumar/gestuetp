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

    // 1. Verifier l'appelant
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parser le payload
    const body = await req.json() as {
      mission_id?: string
      included_codes?: string[]
      custom_questions?: Array<{
        code: string
        text: string
        description?: string | null
        question_type: 'boolean' | 'single_choice' | 'multiple_choice' | 'text' | 'textarea' | 'date' | 'number' | 'scale_percent' | 'file' | 'organigramme'
        options?: string[] | null
        is_required?: boolean
        section?: string | null
      }>
      due_date?: string | null
      section_assignees?: Record<string, string>
    }
    const { mission_id, included_codes, custom_questions, due_date, section_assignees } = body
    if (!mission_id) {
      return new Response(
        JSON.stringify({ error: 'mission_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Charger la mission
    const { data: mission, error: mErr } = await supabaseAdmin
      .from('missions')
      .select('id, framework_id, cabinet_id, client_id')
      .eq('id', mission_id)
      .single()

    if (mErr || !mission) {
      return new Response(
        JSON.stringify({ error: 'Mission introuvable' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Verifier qu'il n'existe pas deja une instance
    const { data: existing } = await supabaseAdmin
      .from('questionnaire_instances')
      .select('id')
      .eq('mission_id', mission_id)
      .limit(1)

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Le questionnaire a déjà été envoyé pour cette mission' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Trouver le template questionnaire du referentiel
    const { data: template, error: tErr } = await supabaseAdmin
      .from('questionnaire_templates')
      .select('id, name, description, version')
      .eq('framework_id', mission.framework_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (tErr || !template) {
      return new Response(
        JSON.stringify({ error: 'Aucun questionnaire disponible pour ce référentiel' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Charger les questions du template
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('template_id', template.id)
      .order('sort_order')

    if (qErr) {
      console.error('launch-questionnaire questions:', qErr.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors du chargement des questions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7a. Filtrer les questions du template selon included_codes (si fourni)
    let selectedQuestions = (questions ?? []) as Array<{ code: string; sort_order?: number; [k: string]: unknown }>
    if (Array.isArray(included_codes) && included_codes.length > 0) {
      const wanted = new Set(included_codes)
      selectedQuestions = selectedQuestions.filter((q) => wanted.has(q.code))
    }

    // 7b. Ajouter les custom questions a la suite.
    //   - Si une section est fournie : code = `${section}-CUSTOM-${slug}` (la question
    //     apparait dans la section choisie cote client + multi-respondent)
    //   - Sinon : code = `CUSTOM-${slug}` (apparait dans un bloc CUSTOM separe)
    // sort_order est calque sur la section quand fournie pour que la question soit
    // a la fin du bloc concerne, sinon repoussee tout en bas.
    const templateSectionPrefixes = new Set(
      (questions ?? []).map((q) => (q as { code: string }).code.split('-')[0])
    )
    const sectionMaxSort = new Map<string, number>()
    for (const q of selectedQuestions) {
      const prefix = q.code.split('-')[0] ?? ''
      const sortVal = Number(q.sort_order ?? 0)
      const cur = sectionMaxSort.get(prefix) ?? 0
      if (sortVal > cur) sectionMaxSort.set(prefix, sortVal)
    }
    const globalMaxSort = selectedQuestions.length > 0
      ? Math.max(...selectedQuestions.map((q) => Number(q.sort_order ?? 0))) + 1
      : 1

    const customNormalized = (custom_questions ?? []).map((cq, idx) => {
      const rawSection = typeof cq.section === 'string' ? cq.section.trim().toUpperCase() : ''
      const section = rawSection && templateSectionPrefixes.has(rawSection) ? rawSection : null
      const slug = cq.code.replace(/^CUSTOM-/i, '').replace(/^[A-Z]+-CUSTOM-/i, '')
      const finalCode = section
        ? `${section}-CUSTOM-${slug}`
        : (cq.code.startsWith('CUSTOM-') ? cq.code : `CUSTOM-${cq.code}`)
      const sort = section
        ? (sectionMaxSort.get(section) ?? 0) + 0.001 * (idx + 1)
        : globalMaxSort + idx
      return {
        id: `custom-${idx}`,
        template_id: template.id,
        code: finalCode,
        text: cq.text,
        description: cq.description ?? null,
        question_type: cq.question_type,
        options: cq.options ?? null,
        is_required: cq.is_required ?? false,
        sort_order: sort,
        prefill_source: null,
        evidence_catalog_id: null,
        is_custom: true,
      }
    })

    // Trier la liste finale par sort_order pour que les customs avec section
    // viennent juste apres la derniere question de leur section.
    const finalQuestions = [...selectedQuestions, ...customNormalized].sort(
      (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
    )

    // 7c. Creer le snapshot (copie figee du template + questions selectionnees + custom)
    const snapshot = {
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        version: template.version,
      },
      questions: finalQuestions,
      total_template: (questions ?? []).length,
      total_included: selectedQuestions.length,
      total_custom: customNormalized.length,
      created_at: new Date().toISOString(),
    }

    // 8. Inserer l'instance
    const { data: instance, error: iErr } = await supabaseAdmin
      .from('questionnaire_instances')
      .insert({
        mission_id,
        template_id: template.id,
        snapshot,
        due_date: due_date ?? null,
        section_assignees: section_assignees ?? {},
      })
      .select('id')
      .single()

    if (iErr || !instance) {
      console.error('launch-questionnaire insert:', iErr?.message)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du questionnaire' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 9. Pre-remplir les questions avec un prefill_source defini
    // On derive cabinet_client_id depuis cabinet_clients.client_org_id = mission.client_id
    let prefilledCount = 0
    {
      const { data: client } = await supabaseAdmin
        .from('cabinet_clients')
        .select('id, effectifs, nombre_sites, client_sector, client_country, activites_principales, it_environment, it_systems')
        .eq('client_org_id', mission.client_id)
        .eq('cabinet_id', mission.cabinet_id)
        .maybeSingle()

      if (client) {
        const PREFILL_GETTERS: Record<string, () => unknown> = {
          'client.effectifs': () => client.effectifs,
          'client.nombre_sites': () => client.nombre_sites,
          'client.client_sector': () => client.client_sector,
          'client.client_country': () => client.client_country,
          'client.activites_principales': () => client.activites_principales,
          'client.it_environment': () => client.it_environment,
          'client.it_systems': () => client.it_systems,
        }

        const prefillRows: Array<{
          instance_id: string
          question_code: string
          response: { value: unknown }
          responded_by: string
          is_prefilled: boolean
        }> = []

        for (const q of selectedQuestions) {
          const source = (q as { prefill_source?: string | null }).prefill_source
          if (!source) continue
          const getter = PREFILL_GETTERS[source]
          if (!getter) continue
          const value = getter()
          if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) continue
          prefillRows.push({
            instance_id: instance.id,
            question_code: q.code,
            response: { value },
            responded_by: caller.id,
            is_prefilled: true,
          })
        }

        if (prefillRows.length > 0) {
          const { error: prefErr } = await supabaseAdmin
            .from('questionnaire_responses')
            .insert(prefillRows)
          if (prefErr) {
            console.error('launch-questionnaire prefill:', prefErr.message)
            // Non-bloquant : l'instance existe deja, le client pourra repondre normalement
          } else {
            prefilledCount = prefillRows.length
          }
        }
      }
    }

    // 10. Mettre a jour le statut de la mission vers 'scoping'
    await supabaseAdmin
      .from('missions')
      .update({ status: 'scoping' })
      .eq('id', mission_id)

    return new Response(
      JSON.stringify({ success: true, instance_id: instance.id, prefilled_count: prefilledCount }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('launch-questionnaire unexpected:', err)
    return new Response(
      JSON.stringify({ error: 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
