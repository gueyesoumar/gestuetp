import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface AdminFrameworkRow {
  id: string
  name: string
  slug: string
  version: string | null
  publisher: string | null
  category: string
  is_active: boolean
  was_ai_generated: boolean
  created_at: string
  domains_count: number
  controls_count: number
  missions_count: number
}

interface Result {
  frameworks: AdminFrameworkRow[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminFrameworks(): Result {
  const [frameworks, setFrameworks] = useState<AdminFrameworkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      const { data: fws, error: fwError } = await supabase
        .from('frameworks')
        .select('id, name, slug, version, publisher, category, is_active, was_ai_generated, created_at')
        .order('created_at', { ascending: false })
        .abortSignal(abort.signal)

      if (abort.signal.aborted) return
      if (fwError) {
        setError('Chargement impossible')
        setLoading(false)
        return
      }
      const rows = (fws ?? []) as Array<Record<string, unknown>>
      const ids = rows.map((r) => r.id as string)
      if (ids.length === 0) {
        setFrameworks([])
        setLoading(false)
        return
      }

      const { data: domains } = await supabase
        .from('domains')
        .select('id, framework_id')
        .in('framework_id', ids)
        .abortSignal(abort.signal)
      const domainsByFramework = new Map<string, string[]>()
      for (const d of ((domains ?? []) as Array<{ id: string; framework_id: string }>)) {
        const arr = domainsByFramework.get(d.framework_id) ?? []
        arr.push(d.id)
        domainsByFramework.set(d.framework_id, arr)
      }

      const allDomainIds = (domains ?? []).map((d: { id: string }) => d.id)
      const { data: controls } = allDomainIds.length > 0
        ? await supabase.from('controls').select('domain_id').in('domain_id', allDomainIds).abortSignal(abort.signal)
        : { data: [] as Array<{ domain_id: string }> }
      const controlsByDomain = new Map<string, number>()
      for (const c of (controls ?? []) as Array<{ domain_id: string }>) {
        controlsByDomain.set(c.domain_id, (controlsByDomain.get(c.domain_id) ?? 0) + 1)
      }

      const { data: missionsRaw } = await supabase
        .from('missions')
        .select('framework_id')
        .in('framework_id', ids)
        .abortSignal(abort.signal)
      const missionsCount = new Map<string, number>()
      for (const m of (missionsRaw ?? []) as Array<{ framework_id: string }>) {
        missionsCount.set(m.framework_id, (missionsCount.get(m.framework_id) ?? 0) + 1)
      }

      const merged: AdminFrameworkRow[] = rows.map((r) => {
        const fwDomainIds = domainsByFramework.get(r.id as string) ?? []
        const ctrlCount = fwDomainIds.reduce((s, did) => s + (controlsByDomain.get(did) ?? 0), 0)
        return {
          id: r.id as string,
          name: r.name as string,
          slug: r.slug as string,
          version: r.version as string | null,
          publisher: r.publisher as string | null,
          category: r.category as string,
          is_active: r.is_active as boolean,
          was_ai_generated: (r.was_ai_generated as boolean) ?? false,
          created_at: r.created_at as string,
          domains_count: fwDomainIds.length,
          controls_count: ctrlCount,
          missions_count: missionsCount.get(r.id as string) ?? 0,
        }
      })

      setFrameworks(merged)
      setLoading(false)
    })()

    return () => abort.abort()
  }, [tick])

  return { frameworks, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
