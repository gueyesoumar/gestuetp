import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { PolicyVersion } from '../../types/database.types'

/** Versions d'une politique + URL signée (fichier privé) + scellement d'approbation. */
export function usePolicyDetail(policyId: string): {
  versions: PolicyVersion[]
  loading: boolean
  refresh: () => void
  signedUrl: (path: string) => Promise<string | null>
  approveVersion: (versionId: string) => Promise<void>
} {
  const { profile } = useAuth()
  const [versions, setVersions] = useState<PolicyVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    supabase.from('policy_versions').select('*').eq('policy_id', policyId)
      .order('created_at', { ascending: false }).abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) { console.error('[usePolicyDetail]', error.message); setLoading(false); return }
        setVersions((data ?? []) as PolicyVersion[])
        setLoading(false)
      })
    return () => ac.abort()
  }, [policyId, key])

  const refresh = useCallback((): void => setKey((k) => k + 1), [])

  const signedUrl = useCallback(async (path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage.from('policy-documents').createSignedUrl(path, 120)
    if (error) { console.error('[signedUrl]', error.message); return null }
    return data?.signedUrl ?? null
  }, [])

  // Sceller une version = l'approuver + faire passer la politique en « approuvée ».
  const approveVersion = useCallback(async (versionId: string): Promise<void> => {
    const now = new Date().toISOString()
    const { error: vErr } = await supabase.from('policy_versions')
      .update({ approved_by: profile?.id ?? null, approved_at: now } as never).eq('id', versionId)
    if (vErr) { console.error('[approveVersion]', vErr.message); return }
    await supabase.from('policies').update({ status: 'approved', approved_at: now } as never).eq('id', policyId)
    refresh()
  }, [policyId, profile?.id, refresh])

  return { versions, loading, refresh, signedUrl, approveVersion }
}
