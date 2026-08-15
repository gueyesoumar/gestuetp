import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface BarrierControl {
  linkId: string
  control_id: string
  code: string
  name: string
  kind: 'preventive' | 'detective' | 'corrective'
  /** Efficacité 0..1 = ratio d'évaluations approuvées du contrôle (même définition que le score). */
  effectiveness: number
  /** Le contrôle a-t-il au moins une évaluation ? (sinon efficacité = 0, non prouvée). */
  assessed: boolean
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
    void (async () => {
      const { data, error } = await supabase.from('risk_control_links')
        .select('id, control_id, kind, control:controls(code, name)')
        .eq('risk_scenario_id', scenarioId).abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) { console.error('[useScenarioControls]', error.message); setLoading(false); return }
      const linkRows = (data ?? []) as unknown as Array<{ id: string; control_id: string; kind: BarrierControl['kind']; control: { code: string; name: string } | null }>
      // Efficacité par contrôle = ratio d'évaluations approuvées (RLS = missions de l'org).
      const ids = [...new Set(linkRows.map((r) => r.control_id))]
      const eff = new Map<string, number>()
      if (ids.length > 0) {
        const { data: asmts } = await supabase.from('control_assessments')
          .select('control_id, status').in('control_id', ids).abortSignal(ac.signal)
        if (ac.signal.aborted) return
        const per = new Map<string, { a: number; t: number }>()
        for (const a of (asmts ?? []) as Array<{ control_id: string; status: string }>) {
          const c = per.get(a.control_id) ?? { a: 0, t: 0 }
          c.t += 1; if (a.status === 'approved') c.a += 1
          per.set(a.control_id, c)
        }
        for (const [cid, c] of per) eff.set(cid, c.t > 0 ? c.a / c.t : 0)
      }
      setBarriers(linkRows.map((r) => ({
        linkId: r.id, control_id: r.control_id, kind: r.kind,
        code: r.control?.code ?? '—', name: r.control?.name ?? '',
        effectiveness: eff.get(r.control_id) ?? 0, assessed: eff.has(r.control_id),
      })))
      setLoading(false)
    })()
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
