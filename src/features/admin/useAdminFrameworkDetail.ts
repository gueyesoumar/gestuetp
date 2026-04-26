import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface AdminFrameworkDetail {
  id: string
  name: string
  slug: string
  version: string | null
  publisher: string | null
  category: string
  description: string | null
  is_active: boolean
  was_ai_generated: boolean
  created_at: string
  updated_at: string
  domains: AdminDomain[]
  missions_count: number
  assessments_count: number
}

export interface AdminDomain {
  id: string
  code: string
  name: string
  description: string | null
  sort_order: number
  is_active: boolean
  controls: AdminControl[]
}

export interface AdminControl {
  id: string
  domain_id: string
  code: string
  name: string
  description: string | null
  guidance: string | null
  sort_order: number
  is_active: boolean
}

interface Result {
  framework: AdminFrameworkDetail | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useAdminFrameworkDetail(slug: string | undefined): Result {
  const [framework, setFramework] = useState<AdminFrameworkDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }

    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      const { data: fw, error: fwError } = await supabase
        .from('frameworks')
        .select('id, name, slug, version, publisher, category, description, is_active, was_ai_generated, created_at, updated_at')
        .eq('slug', slug)
        .abortSignal(abort.signal)
        .single()

      if (abort.signal.aborted) return
      if (fwError || !fw) {
        setError('Référentiel introuvable')
        setLoading(false)
        return
      }
      const f = fw as Record<string, unknown>

      const { data: dms } = await supabase
        .from('domains')
        .select('id, code, name, description, sort_order, is_active')
        .eq('framework_id', f.id as string)
        .order('sort_order', { ascending: true })
        .abortSignal(abort.signal)

      const domains = (dms ?? []) as Array<{ id: string; code: string; name: string; description: string | null; sort_order: number; is_active: boolean }>
      const domainIds = domains.map((d) => d.id)

      const { data: ctrls } = domainIds.length > 0
        ? await supabase
            .from('controls')
            .select('id, domain_id, code, name, description, guidance, sort_order, is_active')
            .in('domain_id', domainIds)
            .order('sort_order', { ascending: true })
            .abortSignal(abort.signal)
        : { data: [] as AdminControl[] }
      const ctrlsByDomain = new Map<string, AdminControl[]>()
      for (const c of ((ctrls ?? []) as AdminControl[])) {
        const arr = ctrlsByDomain.get(c.domain_id) ?? []
        arr.push(c)
        ctrlsByDomain.set(c.domain_id, arr)
      }

      // Counts
      const { count: missionsCount } = await supabase
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('framework_id', f.id as string)
        .abortSignal(abort.signal)

      let assessmentsCount = 0
      if (domainIds.length > 0) {
        const allCtrlIds = (ctrls ?? []).map((c: { id: string }) => c.id)
        if (allCtrlIds.length > 0) {
          const { count } = await supabase
            .from('control_assessments')
            .select('id', { count: 'exact', head: true })
            .in('control_id', allCtrlIds)
            .abortSignal(abort.signal)
          assessmentsCount = count ?? 0
        }
      }

      setFramework({
        id: f.id as string,
        name: f.name as string,
        slug: f.slug as string,
        version: f.version as string | null,
        publisher: f.publisher as string | null,
        category: f.category as string,
        description: f.description as string | null,
        is_active: f.is_active as boolean,
        was_ai_generated: (f.was_ai_generated as boolean) ?? false,
        created_at: f.created_at as string,
        updated_at: f.updated_at as string,
        domains: domains.map((d) => ({
          ...d,
          controls: ctrlsByDomain.get(d.id) ?? [],
        })),
        missions_count: missionsCount ?? 0,
        assessments_count: assessmentsCount,
      })
      setLoading(false)
    })()

    return () => abort.abort()
  }, [slug, tick])

  return { framework, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
