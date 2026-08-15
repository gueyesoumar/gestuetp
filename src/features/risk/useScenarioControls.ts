import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface BarrierControl {
  linkId: string
  control_id: string
  code: string
  name: string
  kind: 'preventive' | 'detective' | 'corrective'
}
export interface ControlOption { id: string; code: string; name: string }

/** Barrières (contrôles Comply liés à un scénario de risque) + recherche de contrôles. */
export function useScenarioControls(scenarioId: string): {
  barriers: BarrierControl[]
  loading: boolean
  search: (q: string) => Promise<ControlOption[]>
  link: (controlId: string, kind: BarrierControl['kind']) => Promise<void>
  unlink: (linkId: string) => Promise<void>
} {
  const { profile } = useAuth()
  const [barriers, setBarriers] = useState<BarrierControl[]>([])
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    supabase.from('risk_control_links')
      .select('id, control_id, kind, control:controls(code, name)')
      .eq('risk_scenario_id', scenarioId).abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) { console.error('[useScenarioControls]', error.message); setLoading(false); return }
        setBarriers(((data ?? []) as unknown as Array<{ id: string; control_id: string; kind: BarrierControl['kind']; control: { code: string; name: string } | null }>).map((r) => ({
          linkId: r.id, control_id: r.control_id, kind: r.kind,
          code: r.control?.code ?? '—', name: r.control?.name ?? '',
        })))
        setLoading(false)
      })
    return () => ac.abort()
  }, [scenarioId, key])

  const search = useCallback(async (q: string): Promise<ControlOption[]> => {
    if (q.trim().length < 2) return []
    const { data } = await supabase.from('controls').select('id, code, name')
      .or(`code.ilike.%${q}%,name.ilike.%${q}%`).limit(15)
    return (data ?? []) as ControlOption[]
  }, [])

  const link = useCallback(async (controlId: string, kind: BarrierControl['kind']): Promise<void> => {
    if (!profile?.organization_id) return
    const { error } = await supabase.from('risk_control_links').insert({
      organization_id: profile.organization_id, risk_scenario_id: scenarioId, control_id: controlId, kind,
    } as never)
    if (error) { console.error('[link control]', error.message); return }
    setKey((k) => k + 1)
  }, [profile?.organization_id, scenarioId])

  const unlink = useCallback(async (linkId: string): Promise<void> => {
    const { error } = await supabase.from('risk_control_links').delete().eq('id', linkId)
    if (error) { console.error('[unlink control]', error.message); return }
    setKey((k) => k + 1)
  }, [])

  return { barriers, loading, search, link, unlink }
}
