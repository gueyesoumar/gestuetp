import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Policy, PolicyStatus, PolicyProvenance, ScoreDimension } from '../../types/database.types'

export interface NewPolicy {
  title: string
  summary: string | null
  dimension: ScoreDimension | null
  provenance: PolicyProvenance
  content: string | null
  file_path: string | null
}

// Horodatage posé selon l'état atteint (péremption/approbation/publication/retrait).
function stampFor(status: PolicyStatus): Partial<Policy> {
  const now = new Date().toISOString()
  if (status === 'approved') return { approved_at: now }
  if (status === 'published') return { published_at: now }
  if (status === 'retired') return { retired_at: now }
  return {}
}

export function usePolicyRegister(): {
  policies: Policy[]
  loading: boolean
  error: string | null
  createPolicy: (p: NewPolicy) => Promise<boolean>
  setStatus: (id: string, status: PolicyStatus) => Promise<void>
  deletePolicy: (id: string) => Promise<void>
  refresh: () => void
} {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (!orgId) { setPolicies([]); setLoading(false); return }
    const ac = new AbortController()
    setLoading(true); setError(null)
    supabase.from('policies').select('*').eq('organization_id', orgId)
      .order('updated_at', { ascending: false }).abortSignal(ac.signal)
      .then(({ data, error: err }) => {
        if (ac.signal.aborted) return
        if (err) { console.error('[usePolicyRegister]', err.message); setError('Erreur de chargement des politiques'); setLoading(false); return }
        setPolicies((data ?? []) as Policy[])
        setLoading(false)
      })
    return () => ac.abort()
  }, [orgId, key])

  const refresh = useCallback((): void => setKey((k) => k + 1), [])

  const createPolicy = useCallback(async (p: NewPolicy): Promise<boolean> => {
    if (!orgId) return false
    // 1. Politique (brouillon) ; 2. première version (contenu ou fichier) ; 3. lien current_version.
    const { data: pol, error: err } = await supabase.from('policies').insert({
      organization_id: orgId, title: p.title, summary: p.summary, dimension: p.dimension,
      provenance: p.provenance, status: 'draft', created_by: profile?.id ?? null,
    } as never).select('id').single<{ id: string }>()
    if (err || !pol) { console.error('[createPolicy]', err?.message); return false }
    const { data: ver, error: vErr } = await supabase.from('policy_versions').insert({
      policy_id: pol.id, organization_id: orgId, version_label: 'v1',
      content: p.content, file_path: p.file_path, created_by: profile?.id ?? null,
    } as never).select('id').single<{ id: string }>()
    if (vErr) { console.error('[createPolicy version]', vErr.message) }
    else if (ver) { await supabase.from('policies').update({ current_version_id: ver.id } as never).eq('id', pol.id) }
    refresh()
    return true
  }, [orgId, profile?.id, refresh])

  const setStatus = useCallback(async (id: string, status: PolicyStatus): Promise<void> => {
    const { error: err } = await supabase.from('policies').update({ status, ...stampFor(status) } as never).eq('id', id)
    if (err) { console.error('[setStatus]', err.message); return }
    refresh()
  }, [refresh])

  const deletePolicy = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await supabase.from('policies').delete().eq('id', id)
    if (err) { console.error('[deletePolicy]', err.message); return }
    refresh()
  }, [refresh])

  return { policies, loading, error, createPolicy, setStatus, deletePolicy, refresh }
}
