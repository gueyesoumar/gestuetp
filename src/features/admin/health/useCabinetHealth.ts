import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export interface ActivityStats {
  lastSignInAt: string | null
  lastSignInUserEmail: string | null
  membersTotal: number
  membersActive: number
  membersConnected30d: number
  missionsCreated30d: number
  missionsTotal: number
  missionsCreatedDaily: number[]
}

export interface ConsumptionStats {
  aiCalls30d: number
  aiInputTokens30d: number
  aiOutputTokens30d: number
  aiCostUsd30d: number
  storageBytes: number
  documentsCount: number
  topAiFunctions: Array<{ name: string; count: number }>
}

export interface ErrorsStats {
  aiErrors30d: number
  topAiError: { functionName: string; count: number; lastMessage: string | null } | null
}

export interface ConfigStats {
  hasLightLogo: boolean
  hasDarkLogo: boolean
  hasPrimaryColor: boolean
  domainsConfigured: number
  domainsVerified: number
  planName: string | null
  activeFlagsCount: number
}

export interface CabinetHealth {
  activity: ActivityStats
  consumption: ConsumptionStats
  errors: ErrorsStats
  config: ConfigStats
  loading: boolean
  error: string | null
}

const EMPTY_HEALTH: Omit<CabinetHealth, 'loading' | 'error'> = {
  activity: {
    lastSignInAt: null,
    lastSignInUserEmail: null,
    membersTotal: 0,
    membersActive: 0,
    membersConnected30d: 0,
    missionsCreated30d: 0,
    missionsTotal: 0,
    missionsCreatedDaily: new Array(30).fill(0) as number[],
  },
  consumption: {
    aiCalls30d: 0,
    aiInputTokens30d: 0,
    aiOutputTokens30d: 0,
    aiCostUsd30d: 0,
    storageBytes: 0,
    documentsCount: 0,
    topAiFunctions: [],
  },
  errors: { aiErrors30d: 0, topAiError: null },
  config: {
    hasLightLogo: false,
    hasDarkLogo: false,
    hasPrimaryColor: false,
    domainsConfigured: 0,
    domainsVerified: 0,
    planName: null,
    activeFlagsCount: 0,
  },
}

const DAY_MS = 24 * 60 * 60 * 1000

function bucketByDay(timestamps: string[], since30: Date): number[] {
  const buckets = new Array(30).fill(0) as number[]
  for (const ts of timestamps) {
    const t = new Date(ts).getTime()
    const diffDays = Math.floor((t - since30.getTime()) / DAY_MS)
    if (diffDays >= 0 && diffDays < 30) buckets[diffDays] += 1
  }
  return buckets
}

export function useCabinetHealth(cabinetId: string | undefined): CabinetHealth {
  const [data, setData] = useState<Omit<CabinetHealth, 'loading' | 'error'>>(EMPTY_HEALTH)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!cabinetId) {
      setLoading(false)
      return
    }
    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const since30Date = new Date(Date.now() - 30 * DAY_MS)
        const since30 = since30Date.toISOString()

        const [{ data: usersData }, { data: missionsAll }, { data: missionsRecent }] = await Promise.all([
          supabase
            .from('users')
            .select('id, email, is_active, last_sign_in_at')
            .eq('organization_id', cabinetId)
            .abortSignal(abort.signal),
          supabase
            .from('missions')
            .select('id', { count: 'exact', head: true })
            .eq('cabinet_id', cabinetId)
            .abortSignal(abort.signal),
          supabase
            .from('missions')
            .select('created_at')
            .eq('cabinet_id', cabinetId)
            .gte('created_at', since30)
            .abortSignal(abort.signal),
        ])
        if (abort.signal.aborted) return

        const users = (usersData ?? []) as Array<{ email: string | null; is_active: boolean; last_sign_in_at: string | null }>
        let lastSignInAt: string | null = null
        let lastSignInUserEmail: string | null = null
        for (const u of users) {
          if (!u.last_sign_in_at) continue
          if (!lastSignInAt || u.last_sign_in_at > lastSignInAt) {
            lastSignInAt = u.last_sign_in_at
            lastSignInUserEmail = u.email
          }
        }
        const membersConnected30d = users.filter((u) => u.last_sign_in_at && u.last_sign_in_at >= since30).length
        const missionsRecentTs = ((missionsRecent ?? []) as Array<{ created_at: string }>).map((m) => m.created_at)
        const missionsCreatedDaily = bucketByDay(missionsRecentTs, since30Date)

        const activity: ActivityStats = {
          lastSignInAt,
          lastSignInUserEmail,
          membersTotal: users.length,
          membersActive: users.filter((u) => u.is_active).length,
          membersConnected30d,
          missionsCreated30d: missionsRecentTs.length,
          missionsTotal: (missionsAll as unknown as { count?: number } | null)?.count ?? 0,
          missionsCreatedDaily,
        }

        const [{ data: aiCalls }, { data: docs }] = await Promise.all([
          supabase
            .from('ai_calls_log')
            .select('function_name, input_tokens, output_tokens, cost_estimate_usd, success')
            .eq('organization_id', cabinetId)
            .gte('created_at', since30)
            .abortSignal(abort.signal),
          supabase
            .from('documents')
            .select('file_size, mission:missions!inner(cabinet_id)')
            .eq('mission.cabinet_id', cabinetId)
            .abortSignal(abort.signal),
        ])
        if (abort.signal.aborted) return

        const ai = (aiCalls ?? []) as Array<{ function_name: string; input_tokens: number | null; output_tokens: number | null; cost_estimate_usd: number | null; success: boolean }>
        const documents = (docs ?? []) as Array<{ file_size: number | null }>

        const fnCounts = new Map<string, number>()
        for (const c of ai) fnCounts.set(c.function_name, (fnCounts.get(c.function_name) ?? 0) + 1)
        const topAiFunctions = [...fnCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }))

        const consumption: ConsumptionStats = {
          aiCalls30d: ai.length,
          aiInputTokens30d: ai.reduce((s, c) => s + (c.input_tokens ?? 0), 0),
          aiOutputTokens30d: ai.reduce((s, c) => s + (c.output_tokens ?? 0), 0),
          aiCostUsd30d: ai.reduce((s, c) => s + Number(c.cost_estimate_usd ?? 0), 0),
          storageBytes: documents.reduce((s, d) => s + (d.file_size ?? 0), 0),
          documentsCount: documents.length,
          topAiFunctions,
        }

        const { data: aiErrors } = await supabase
          .from('ai_calls_log')
          .select('function_name, error_message, created_at')
          .eq('organization_id', cabinetId)
          .eq('success', false)
          .gte('created_at', since30)
          .order('created_at', { ascending: false })
          .abortSignal(abort.signal)
        if (abort.signal.aborted) return

        const errs = (aiErrors ?? []) as Array<{ function_name: string; error_message: string | null; created_at: string }>
        let topAiError: ErrorsStats['topAiError'] = null
        if (errs.length > 0) {
          const byFunc = new Map<string, { count: number; lastMessage: string | null }>()
          for (const e of errs) {
            const cur = byFunc.get(e.function_name) ?? { count: 0, lastMessage: null }
            cur.count += 1
            if (cur.lastMessage === null) cur.lastMessage = e.error_message
            byFunc.set(e.function_name, cur)
          }
          const [topName, topData] = [...byFunc.entries()].sort((a, b) => b[1].count - a[1].count)[0]
          topAiError = { functionName: topName, count: topData.count, lastMessage: topData.lastMessage }
        }

        const errorsStats: ErrorsStats = { aiErrors30d: errs.length, topAiError }

        const [{ data: branding }, { data: domains }, { data: orgPlan }, { data: flagOverrides }] = await Promise.all([
          supabase
            .from('organization_branding')
            .select('logo_light_url, logo_dark_url, primary_color')
            .eq('organization_id', cabinetId)
            .maybeSingle()
            .abortSignal(abort.signal),
          supabase
            .from('cabinet_domains')
            .select('id, is_verified')
            .eq('cabinet_id', cabinetId)
            .abortSignal(abort.signal),
          supabase
            .from('organizations')
            .select('plan_id, plan:plans(name)')
            .eq('id', cabinetId)
            .single()
            .abortSignal(abort.signal),
          supabase
            .from('feature_flag_overrides')
            .select('id, enabled')
            .eq('organization_id', cabinetId)
            .eq('enabled', true)
            .abortSignal(abort.signal),
        ])
        if (abort.signal.aborted) return

        const b = branding as { logo_light_url: string | null; logo_dark_url: string | null; primary_color: string | null } | null
        const dom = (domains ?? []) as Array<{ is_verified: boolean }>
        const plan = orgPlan as { plan: { name: string } | null } | null
        const flags = (flagOverrides ?? []) as Array<{ enabled: boolean }>

        const config: ConfigStats = {
          hasLightLogo: !!b?.logo_light_url,
          hasDarkLogo: !!b?.logo_dark_url,
          hasPrimaryColor: !!b?.primary_color,
          domainsConfigured: dom.length,
          domainsVerified: dom.filter((d) => d.is_verified).length,
          planName: plan?.plan?.name ?? null,
          activeFlagsCount: flags.length,
        }

        setData({ activity, consumption, errors: errorsStats, config })
        setLoading(false)
      } catch (err) {
        if (abort.signal.aborted) return
        console.error('useCabinetHealth:', err)
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
        setLoading(false)
      }
    })()

    return () => abort.abort()
  }, [cabinetId])

  return { ...data, loading, error }
}
