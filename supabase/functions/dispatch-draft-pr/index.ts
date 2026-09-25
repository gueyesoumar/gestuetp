import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { authenticateCaller } from '../_shared/auth.ts'
import { logAdminAction } from '../_shared/auth-platform-owner.ts'

// Phase 5b (code-facing, RFC 0010) : déclenche la génération d'un BROUILLON de PR
// (chemin d'écriture, cible staging uniquement). UI-facing -> JWT + platform owner + flag DPA.
// Re-vérifie l'ÉLIGIBILITÉ côté serveur (déc. C) à partir du rapport d'impact : verdict go,
// effort S/M, aucune couche à fort enjeu (migration/RLS/edge/auth), aucun bloquant.
// Ne transmet que run_id au workflow ; trace l'action dans admin_audit_log.

interface ImpactResult {
  verdict?: string
  migrations?: { needed?: boolean }
  backend?: { edges?: unknown }
  rls_impact?: { verdict?: string }
  securite?: { verdict?: string }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const auth = await authenticateCaller(admin, req)
    if (!auth.ok) return json({ error: auth.message }, auth.status)

    const { data: me } = await admin.from('users').select('is_platform_owner').eq('id', auth.profile.id).maybeSingle()
    if (!me?.is_platform_owner) return json({ error: 'Acces reserve.' }, 403)

    const { data: flag } = await admin.from('feature_flags').select('is_globally_enabled').eq('slug', 'support_agent_draft_pr').maybeSingle()
    if (!flag?.is_globally_enabled) return json({ error: 'Agent brouillon de PR desactive.' }, 403)

    const ghToken = Deno.env.get('GITHUB_DISPATCH_TOKEN')
    const ghRepo = Deno.env.get('GITHUB_REPO')
    const ghRef = Deno.env.get('DRAFT_PR_WORKFLOW_REF') ?? Deno.env.get('FEASIBILITY_WORKFLOW_REF') ?? 'main'
    if (!ghToken || !ghRepo) return json({ error: 'Dispatch non configure.' }, 500)

    const { request_id, impact_run_id, force } = await req.json()
    if (!request_id || !impact_run_id) return json({ error: 'request_id et impact_run_id requis' }, 400)

    // Le run d'impact doit exister, être terminé, et appartenir à la même suggestion (pas d'IDOR).
    const { data: impactRun } = await admin.from('agent_runs')
      .select('id, request_id, kind, status, result, parent_run_id')
      .eq('id', impact_run_id).maybeSingle()
    if (!impactRun || impactRun.kind !== 'impact' || impactRun.request_id !== request_id) return json({ error: 'Analyse d impact introuvable' }, 404)
    if (impactRun.status !== 'done') return json({ error: 'Analyse d impact non terminee' }, 409)

    const impact = (impactRun.result ?? {}) as ImpactResult

    // Effort : lu sur le run de faisabilité parent de l'impact.
    let effort = ''
    if (impactRun.parent_run_id) {
      const { data: feas } = await admin.from('agent_runs').select('result').eq('id', impactRun.parent_run_id).maybeSingle()
      const fr = (feas?.result ?? {}) as { effort_estimate?: string }
      effort = String(fr.effort_estimate ?? '')
    }

    // ÉLIGIBILITÉ (déc. C) — multi-facteur, périmètre frontend-only / additif.
    // L'owner peut FORCER (déc. C amendée) sur tous les motifs SAUF un bloquant
    // sécurité/RLS (garde-fou dur, jamais forçable). Le write-path reste sûr quoi
    // qu'il arrive (staging-only, diff limité à src/, gates).
    const edges = Array.isArray(impact.backend?.edges) ? (impact.backend?.edges as unknown[]) : []
    const hardBlock = impact.rls_impact?.verdict === 'bloquant' || impact.securite?.verdict === 'bloquant'
    const reasons: string[] = []
    if (impact.verdict !== 'go') reasons.push('verdict non « go »')
    if (!['S', 'M'].includes(effort)) reasons.push('effort > M (ou inconnu)')
    if (impact.migrations?.needed === true) reasons.push('migration requise')
    if (edges.length > 0) reasons.push('modifie des edge functions')
    if (impact.rls_impact?.verdict === 'bloquant') reasons.push('impact RLS bloquant')
    if (impact.securite?.verdict === 'bloquant') reasons.push('constat sécurité bloquant')
    if (reasons.length > 0) {
      if (hardBlock) {
        return json({ error: 'Brouillon refusé : bloquant sécurité/RLS. À traiter manuellement.' }, 409)
      }
      if (force !== true) {
        return json({ error: `Non recommandé (${reasons.join(', ')}). Générez « quand même » pour forcer.`, reasons }, 409)
      }
      // force === true et pas de bloquant sécu/RLS → on procède (override owner, tracé).
    }
    const forced = reasons.length > 0

    const { data: run, error: runErr } = await admin.from('agent_runs').insert({
      request_id, kind: 'draft_pr', status: 'running', created_by: auth.profile.id,
      parent_run_id: impact_run_id, pr_state: 'drafted',
      result: forced ? { forced: true, bypassed: reasons } : null,
    }).select('id').single()
    if (runErr || !run) return json({ error: 'Creation du run impossible.' }, 500)

    // Trace l'action owner dans admin_audit_log (best-effort, ne bloque pas le dispatch).
    // Un override (forced) est explicitement journalisé avec les critères contournés.
    try {
      const reason = forced
        ? `Génération FORCÉE d un brouillon de PR (owner) — override : ${reasons.join(', ')}`
        : 'Génération d un brouillon de PR (agent, staging)'
      await logAdminAction(admin, auth.profile.id, forced ? 'agent.draft_pr.force' : 'agent.draft_pr.dispatch',
        'support_request', request_id, reason, { run_id: run.id, impact_run_id, forced, bypassed: reasons })
    } catch (e) { console.error('draft-pr audit:', e instanceof Error ? e.message : String(e)) }

    const res = await fetch(`https://api.github.com/repos/${ghRepo}/actions/workflows/draft-pr.yml/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ghToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        'User-Agent': 'gestu-comply-dispatch',
      },
      body: JSON.stringify({ ref: ghRef, inputs: { run_id: run.id } }),
    })

    if (!res.ok) {
      const detail = await res.text()
      console.error('dispatch-draft-pr github:', res.status, detail.slice(0, 300))
      await admin.from('agent_runs').update({ status: 'error', pr_state: 'error', result: { _error: 'dispatch GitHub echoue' } }).eq('id', run.id)
      return json({ error: 'Declenchement du brouillon impossible.' }, 502)
    }

    return json({ ok: true, run_id: run.id })
  } catch (err) {
    console.error('dispatch-draft-pr:', err instanceof Error ? err.message : String(err))
    return json({ error: 'Erreur interne.' }, 500)
  }
})
