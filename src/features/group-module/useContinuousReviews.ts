import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { SupervisionCycle } from '../../types/database.types'

export interface ContinuousReviewMission {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  framework_name: string | null
  subsidiary_id: string | null
  subsidiary_name: string | null
  lead_auditor_name: string | null
  cycles: SupervisionCycle[]
}

interface UseContinuousReviewsResult {
  missions: ContinuousReviewMission[]
  loading: boolean
  reload: () => Promise<void>
}

export function useContinuousReviews(): UseContinuousReviewsResult {
  const { profile } = useAuth()
  const [missions, setMissions] = useState<ContinuousReviewMission[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    // 1. Filiales du groupe
    const { data: subs } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('parent_org_id', profile.organization_id)
    if (signal?.aborted) return
    const subList = (subs ?? []) as Array<{ id: string; name: string }>
    if (subList.length === 0) {
      setMissions([])
      setLoading(false)
      return
    }
    const subMap = new Map(subList.map((s) => [s.id, s.name]))

    // 2. Missions de supervision continue sur ces filiales
    const { data: rows } = await supabase
      .from('missions')
      .select('id, name, start_date, end_date, framework_id, lead_auditor_id, client_id')
      .in('client_id', subList.map((s) => s.id))
      .eq('kind', 'continuous_supervision')
      .order('start_date', { ascending: false })
    if (signal?.aborted) return
    const list = (rows ?? []) as Array<{
      id: string; name: string; start_date: string | null; end_date: string | null;
      framework_id: string | null; lead_auditor_id: string | null; client_id: string | null;
    }>

    // 3. Frameworks et users
    const fwIds = Array.from(new Set(list.map((m) => m.framework_id).filter(Boolean) as string[]))
    const userIds = Array.from(new Set(list.map((m) => m.lead_auditor_id).filter(Boolean) as string[]))
    const [{ data: fws }, { data: users }] = await Promise.all([
      fwIds.length > 0
        ? supabase.from('frameworks').select('id, name').in('id', fwIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
      userIds.length > 0
        ? supabase.from('users').select('id, first_name, last_name, email').in('id', userIds)
        : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; email: string }> }),
    ])
    if (signal?.aborted) return
    const fwMap = new Map((fws ?? []).map((f) => [f.id, f.name]))
    const userMap = new Map<string, string>()
    for (const u of users ?? []) {
      userMap.set(u.id, [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email)
    }

    // 4. Cycles
    const missionIds = list.map((m) => m.id)
    const { data: cycleRows } = (missionIds.length > 0
      ? await supabase
          .from('supervision_cycles')
          .select('*')
          .in('mission_id', missionIds)
          .order('period_start', { ascending: true })
      : { data: [] }) as { data: SupervisionCycle[] }
    if (signal?.aborted) return

    const enriched: ContinuousReviewMission[] = list.map((m) => ({
      id: m.id,
      name: m.name,
      start_date: m.start_date,
      end_date: m.end_date,
      framework_name: m.framework_id ? fwMap.get(m.framework_id) ?? null : null,
      subsidiary_id: m.client_id,
      subsidiary_name: m.client_id ? subMap.get(m.client_id) ?? null : null,
      lead_auditor_name: m.lead_auditor_id ? userMap.get(m.lead_auditor_id) ?? null : null,
      cycles: cycleRows.filter((c) => c.mission_id === m.id),
    }))
    setMissions(enriched)
    setLoading(false)
  }, [profile?.organization_id])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    void load(ac.signal)
    return () => ac.abort()
  }, [load])

  const reload = useCallback(async (): Promise<void> => { await load() }, [load])

  return { missions, loading, reload }
}
