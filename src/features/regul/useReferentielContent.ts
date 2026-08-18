import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export interface RefControl {
  id: string
  domain_id: string
  code: string
  name: string
  risk_level: string | null
  sort_order: number
}
export interface RefDomain {
  id: string
  code: string
  name: string
  description: string | null
  sort_order: number
  controls: RefControl[]
}

/** Domaines + contrôles d'un référentiel (lecture seule, Regul / M6). */
export function useReferentielContent(frameworkId: string | null) {
  const [domains, setDomains] = useState<RefDomain[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!frameworkId) { setDomains([]); return }
    const ac = new AbortController()
    setLoading(true)
    const load = async (): Promise<void> => {
      const { data: doms, error: dErr } = await supabase
        .from('domains')
        .select('id, code, name, description, sort_order')
        .eq('framework_id', frameworkId)
        .order('sort_order')
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (dErr) { console.error('[useReferentielContent] domains:', dErr.message); setLoading(false); return }
      const domList = (doms ?? []) as Omit<RefDomain, 'controls'>[]
      const ids = domList.map((d) => d.id)
      let ctrls: RefControl[] = []
      if (ids.length > 0) {
        const { data: cs, error: cErr } = await supabase
          .from('controls')
          .select('id, domain_id, code, name, risk_level, sort_order')
          .in('domain_id', ids)
          .order('sort_order')
          .abortSignal(ac.signal)
        if (ac.signal.aborted) return
        if (cErr) console.error('[useReferentielContent] controls:', cErr.message)
        ctrls = (cs ?? []) as unknown as RefControl[]
      }
      setDomains(domList.map((d) => ({ ...d, controls: ctrls.filter((c) => c.domain_id === d.id) })))
      setLoading(false)
    }
    void load()
    return () => ac.abort()
  }, [frameworkId])

  const totalControls = domains.reduce((n, d) => n + d.controls.length, 0)
  return { domains, totalControls, loading }
}
