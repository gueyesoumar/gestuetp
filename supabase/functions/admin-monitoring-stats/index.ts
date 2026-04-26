import { corsHeaders } from '../_shared/cors.ts'
import { requirePlatformOwner } from '../_shared/auth-platform-owner.ts'

/**
 * Edge Function : admin-monitoring-stats
 *
 * Agrège les stats de la page /admin/monitoring :
 *  - usage Anthropic (tokens, coût, échecs) sur 7j et 30j
 *  - breakdown par fonction IA et par cabinet
 *  - emails envoyés (depuis email_log) sur 30j par type
 *  - storage par cabinet (sum file_size sur documents)
 *  - liste des derniers échecs
 *
 * Service-role + requirePlatformOwner.
 */

interface MonitoringStats {
  // Usage Anthropic
  ai_30d: AggCounters
  ai_7d: AggCounters
  ai_per_function: FunctionStat[]
  ai_per_cabinet: CabinetStat[]
  ai_recent_failures: FailureRow[]

  // Emails
  emails_30d_total: number
  emails_30d_by_type: Array<{ type: string; count: number }>

  // Storage
  storage_per_cabinet: CabinetStorage[]
  storage_total_mb: number
}

interface AggCounters {
  total_calls: number
  success_calls: number
  failed_calls: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
  avg_duration_ms: number
}

interface FunctionStat {
  function_name: string
  calls: number
  success_rate: number
  cost_usd: number
  avg_duration_ms: number
  last_failure_at: string | null
}

interface CabinetStat {
  organization_id: string
  cabinet_name: string
  calls: number
  cost_usd: number
}

interface FailureRow {
  id: string
  function_name: string
  model: string | null
  error_message: string | null
  created_at: string
  cabinet_name: string | null
}

interface CabinetStorage {
  organization_id: string
  cabinet_name: string
  total_bytes: number
  documents_count: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const guard = await requirePlatformOwner(req, corsHeaders)
  if (guard instanceof Response) return guard
  const { admin } = guard

  try {
    const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString()

    // 1. Toutes les lignes ai_calls_log des 30 derniers jours
    const { data: callsRaw } = await admin
      .from('ai_calls_log')
      .select('function_name, model, input_tokens, output_tokens, cost_estimate_usd, success, error_message, organization_id, duration_ms, created_at')
      .gte('created_at', since30)
      .order('created_at', { ascending: false })

    const calls = (callsRaw ?? []) as Array<{
      function_name: string
      model: string | null
      input_tokens: number | null
      output_tokens: number | null
      cost_estimate_usd: number | null
      success: boolean
      error_message: string | null
      organization_id: string | null
      duration_ms: number | null
      created_at: string
    }>

    const since7Date = new Date(since7)
    const calls7d = calls.filter((c) => new Date(c.created_at) >= since7Date)

    const aggregate = (rows: typeof calls): AggCounters => {
      let total = 0, success = 0, failed = 0
      let input = 0, output = 0, cost = 0, durationSum = 0, durationCount = 0
      for (const c of rows) {
        total++
        if (c.success) success++; else failed++
        input += c.input_tokens ?? 0
        output += c.output_tokens ?? 0
        cost += Number(c.cost_estimate_usd ?? 0)
        if (c.duration_ms != null) {
          durationSum += c.duration_ms
          durationCount++
        }
      }
      return {
        total_calls: total,
        success_calls: success,
        failed_calls: failed,
        input_tokens: input,
        output_tokens: output,
        cost_usd: Math.round(cost * 1_000_000) / 1_000_000,
        avg_duration_ms: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
      }
    }

    // 2. Per-function breakdown (sur 30j)
    const fnMap = new Map<string, { calls: number; success: number; cost: number; durationSum: number; durationCount: number; lastFailure: string | null }>()
    for (const c of calls) {
      const e = fnMap.get(c.function_name) ?? { calls: 0, success: 0, cost: 0, durationSum: 0, durationCount: 0, lastFailure: null }
      e.calls++
      if (c.success) e.success++
      e.cost += Number(c.cost_estimate_usd ?? 0)
      if (c.duration_ms != null) { e.durationSum += c.duration_ms; e.durationCount++ }
      if (!c.success && (e.lastFailure === null || c.created_at > e.lastFailure)) e.lastFailure = c.created_at
      fnMap.set(c.function_name, e)
    }
    const ai_per_function: FunctionStat[] = Array.from(fnMap.entries()).map(([name, e]) => ({
      function_name: name,
      calls: e.calls,
      success_rate: e.calls > 0 ? Math.round((e.success / e.calls) * 1000) / 10 : 0,
      cost_usd: Math.round(e.cost * 1_000_000) / 1_000_000,
      avg_duration_ms: e.durationCount > 0 ? Math.round(e.durationSum / e.durationCount) : 0,
      last_failure_at: e.lastFailure,
    })).sort((a, b) => b.cost_usd - a.cost_usd)

    // 3. Per-cabinet breakdown (top 10 par coût)
    const orgMap = new Map<string, { calls: number; cost: number }>()
    for (const c of calls) {
      if (!c.organization_id) continue
      const e = orgMap.get(c.organization_id) ?? { calls: 0, cost: 0 }
      e.calls++
      e.cost += Number(c.cost_estimate_usd ?? 0)
      orgMap.set(c.organization_id, e)
    }
    const cabinetIds = Array.from(orgMap.keys())
    let cabinetNames = new Map<string, string>()
    if (cabinetIds.length > 0) {
      const { data: orgs } = await admin.from('organizations').select('id, name').in('id', cabinetIds)
      for (const o of ((orgs ?? []) as Array<{ id: string; name: string }>)) cabinetNames.set(o.id, o.name)
    }
    const ai_per_cabinet: CabinetStat[] = Array.from(orgMap.entries()).map(([id, e]) => ({
      organization_id: id,
      cabinet_name: cabinetNames.get(id) ?? '—',
      calls: e.calls,
      cost_usd: Math.round(e.cost * 1_000_000) / 1_000_000,
    })).sort((a, b) => b.cost_usd - a.cost_usd).slice(0, 10)

    // 4. Recent failures (top 50)
    const failureRows = calls.filter((c) => !c.success).slice(0, 50)
    const ai_recent_failures: FailureRow[] = failureRows.map((c) => ({
      id: `${c.created_at}-${c.function_name}`,
      function_name: c.function_name,
      model: c.model,
      error_message: c.error_message,
      created_at: c.created_at,
      cabinet_name: c.organization_id ? cabinetNames.get(c.organization_id) ?? null : null,
    }))

    // 5. Emails 30j
    const { data: emails } = await admin
      .from('email_log')
      .select('type')
      .gte('sent_at', since30)
    const emailRows = (emails ?? []) as Array<{ type: string }>
    const emailMap = new Map<string, number>()
    for (const r of emailRows) emailMap.set(r.type, (emailMap.get(r.type) ?? 0) + 1)
    const emails_30d_by_type = Array.from(emailMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)

    // 6. Storage per cabinet
    const { data: docs } = await admin
      .from('documents')
      .select('mission_id, file_size')
    const docsByCabinet = new Map<string, { bytes: number; count: number }>()
    if (docs && docs.length > 0) {
      // Need mission → cabinet_id mapping
      const missionIds = Array.from(new Set(((docs ?? []) as Array<{ mission_id: string | null }>).map((d) => d.mission_id).filter((x): x is string => x !== null)))
      if (missionIds.length > 0) {
        const { data: missions } = await admin.from('missions').select('id, cabinet_id').in('id', missionIds)
        const missionToCabinet = new Map<string, string>()
        for (const m of ((missions ?? []) as Array<{ id: string; cabinet_id: string }>)) missionToCabinet.set(m.id, m.cabinet_id)
        for (const d of (docs as Array<{ mission_id: string | null; file_size: number | null }>)) {
          if (!d.mission_id) continue
          const cabId = missionToCabinet.get(d.mission_id)
          if (!cabId) continue
          const e = docsByCabinet.get(cabId) ?? { bytes: 0, count: 0 }
          e.bytes += d.file_size ?? 0
          e.count++
          docsByCabinet.set(cabId, e)
        }
        // Fill cabinet names if missing
        const newCabIds = Array.from(docsByCabinet.keys()).filter((id) => !cabinetNames.has(id))
        if (newCabIds.length > 0) {
          const { data: newOrgs } = await admin.from('organizations').select('id, name').in('id', newCabIds)
          for (const o of ((newOrgs ?? []) as Array<{ id: string; name: string }>)) cabinetNames.set(o.id, o.name)
        }
      }
    }
    const storage_per_cabinet: CabinetStorage[] = Array.from(docsByCabinet.entries()).map(([id, e]) => ({
      organization_id: id,
      cabinet_name: cabinetNames.get(id) ?? '—',
      total_bytes: e.bytes,
      documents_count: e.count,
    })).sort((a, b) => b.total_bytes - a.total_bytes).slice(0, 10)
    const storage_total_mb = Array.from(docsByCabinet.values()).reduce((sum, e) => sum + e.bytes, 0) / 1_048_576

    const stats: MonitoringStats = {
      ai_30d: aggregate(calls),
      ai_7d: aggregate(calls7d),
      ai_per_function,
      ai_per_cabinet,
      ai_recent_failures,
      emails_30d_total: emailRows.length,
      emails_30d_by_type,
      storage_per_cabinet,
      storage_total_mb: Math.round(storage_total_mb * 100) / 100,
    }

    return jsonResponse(stats as unknown as Record<string, unknown>)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin-monitoring-stats] error:', message)
    return jsonResponse({ error: message }, 500)
  }
})

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
