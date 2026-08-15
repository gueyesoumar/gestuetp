import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface LinkedControl { linkId: string; control_id: string; code: string; name: string }
export interface ControlOption { id: string; code: string; name: string }

/** Contrôles satisfaits par une politique (Policy-as-Evidence, côté Policy). */
export function usePolicyControls(policyId: string): {
  controls: LinkedControl[]
  loading: boolean
  search: (q: string) => Promise<ControlOption[]>
  link: (controlId: string) => Promise<void>
  unlink: (linkId: string) => Promise<void>
} {
  const { profile } = useAuth()
  const orgId = profile?.organization_id
  const [controls, setControls] = useState<LinkedControl[]>([])
  const [loading, setLoading] = useState(true)
  const [key, setKey] = useState(0)

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    supabase.from('policy_control_links')
      .select('id, control_id, control:controls(code, name)')
      .eq('policy_id', policyId).abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) { console.error('[usePolicyControls]', error.message); setLoading(false); return }
        setControls(((data ?? []) as unknown as Array<{ id: string; control_id: string; control: { code: string; name: string } | null }>).map((r) => ({
          linkId: r.id, control_id: r.control_id, code: r.control?.code ?? '—', name: r.control?.name ?? '',
        })))
        setLoading(false)
      })
    return () => ac.abort()
  }, [policyId, key])

  const search = useCallback(async (q: string): Promise<ControlOption[]> => {
    if (q.trim().length < 2) return []
    const { data } = await supabase.from('controls').select('id, code, name')
      .or(`code.ilike.%${q}%,name.ilike.%${q}%`).limit(15)
    return (data ?? []) as ControlOption[]
  }, [])

  const link = useCallback(async (controlId: string): Promise<void> => {
    if (!orgId) return
    const { error } = await supabase.from('policy_control_links').insert({
      organization_id: orgId, policy_id: policyId, control_id: controlId,
    } as never)
    if (error) { console.error('[link control]', error.message); return }
    setKey((k) => k + 1)
  }, [orgId, policyId])

  const unlink = useCallback(async (linkId: string): Promise<void> => {
    const { error } = await supabase.from('policy_control_links').delete().eq('id', linkId)
    if (error) { console.error('[unlink control]', error.message); return }
    setKey((k) => k + 1)
  }, [])

  return { controls, loading, search, link, unlink }
}
