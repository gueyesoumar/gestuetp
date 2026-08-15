import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface FwOption { id: string; name: string }
export interface RequiredPolicy { evidenceId: string; name: string; controlId: string; controlCode: string; covered: boolean }

/** Couverture framework-driven : jeu de politiques requises (evidence_catalog.kind=policy)
 *  vs politiques approuvées liées aux contrôles. */
export function usePolicyCoverage(): {
  frameworks: FwOption[]
  selected: string | null
  select: (id: string) => void
  required: RequiredPolicy[]
  coverage: number
  loading: boolean
  refresh: () => void
} {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const [frameworks, setFrameworks] = useState<FwOption[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [required, setRequired] = useState<RequiredPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)

  // Référentiels de l'org (via ses missions).
  useEffect(() => {
    if (!orgId) return
    const ac = new AbortController()
    supabase.from('missions').select('framework_id, framework:frameworks(name)')
      .or(`cabinet_id.eq.${orgId},client_id.eq.${orgId}`).abortSignal(ac.signal)
      .then(({ data }) => {
        if (ac.signal.aborted) return
        const map = new Map<string, string>()
        for (const m of (data ?? []) as unknown as Array<{ framework_id: string; framework: { name: string } | null }>) {
          if (m.framework_id) map.set(m.framework_id, m.framework?.name ?? '—')
        }
        const list = [...map].map(([id, name]) => ({ id, name }))
        setFrameworks(list)
        setSelected((s) => s ?? list[0]?.id ?? null)
      })
    return () => ac.abort()
  }, [orgId])

  // Jeu requis + couverture pour le référentiel sélectionné.
  useEffect(() => {
    if (!selected) { setRequired([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data: doms } = await supabase.from('domains').select('id').eq('framework_id', selected).abortSignal(ac.signal)
      const domainIds = (doms ?? []).map((d: { id: string }) => d.id)
      if (domainIds.length === 0) { if (!ac.signal.aborted) { setRequired([]); setLoading(false) } return }
      const { data: ctrls } = await supabase.from('controls').select('id, code').in('domain_id', domainIds).abortSignal(ac.signal)
      const controls = (ctrls ?? []) as Array<{ id: string; code: string }>
      const controlIds = controls.map((c) => c.id)
      const codeById = new Map(controls.map((c) => [c.id, c.code]))
      if (controlIds.length === 0) { if (!ac.signal.aborted) { setRequired([]); setLoading(false) } return }
      const [{ data: ev }, { data: links }] = await Promise.all([
        supabase.from('evidence_catalog').select('id, name, control_id').in('control_id', controlIds).eq('kind', 'policy').abortSignal(ac.signal),
        supabase.from('policy_control_links').select('control_id, policy:policies(status)').in('control_id', controlIds).abortSignal(ac.signal),
      ])
      if (ac.signal.aborted) return
      const coveredCtrls = new Set<string>()
      for (const l of (links ?? []) as unknown as Array<{ control_id: string; policy: { status: string } | null }>) {
        if (l.policy && (l.policy.status === 'approved' || l.policy.status === 'published')) coveredCtrls.add(l.control_id)
      }
      setRequired(((ev ?? []) as Array<{ id: string; name: string; control_id: string }>).map((e) => ({
        evidenceId: e.id, name: e.name, controlId: e.control_id,
        controlCode: codeById.get(e.control_id) ?? '—', covered: coveredCtrls.has(e.control_id),
      })))
      setLoading(false)
    })()
    return () => ac.abort()
  }, [selected, key])

  const coverage = required.length ? Math.round((required.filter((r) => r.covered).length / required.length) * 100) : 0
  return { frameworks, selected, select: setSelected, required, coverage, loading, refresh: useCallback(() => setKey((k) => k + 1), []) }
}
