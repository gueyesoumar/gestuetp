import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface SupervisionAssignment {
  id: string
  assignee_user_id: string
  assignee_name: string
  assignee_email: string
  scope_type: 'org' | 'sector'
  scope_org_id: string | null
  scope_label: string
  created_at: string
}

export interface AddAssignmentInput {
  userId: string
  scopeType: 'org' | 'sector'
  scopeOrgId?: string
  scopeSector?: string
}

interface Result {
  assignments: SupervisionAssignment[]
  loading: boolean
  error: string | null
  add: (input: AddAssignmentInput) => Promise<{ ok: boolean; error?: string }>
  remove: (id: string) => Promise<{ ok: boolean; error?: string }>
  refetch: () => void
}

/** Affectations de supervision (membre -> assujetti/secteur) via RPC SECURITY DEFINER. */
export function useSupervisionAssignments(): Result {
  const [assignments, setAssignments] = useState<SupervisionAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  const refetch = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    void (async () => {
      const { data, error: rpcError } = await supabase
        .rpc('get_supervision_assignments')
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (rpcError) {
        console.error('get_supervision_assignments:', rpcError.message)
        setError('Chargement des affectations impossible.')
        setLoading(false)
        return
      }
      setAssignments((data ?? []) as unknown as SupervisionAssignment[])
      setLoading(false)
    })()
    return () => ac.abort()
  }, [key])

  const add = useCallback(async (input: AddAssignmentInput) => {
    const { error: rpcError } = await supabase.rpc('add_supervision_assignment', {
      p_user_id: input.userId,
      p_scope_type: input.scopeType,
      p_scope_org_id: input.scopeOrgId ?? null,
      p_scope_sector: input.scopeSector ?? null,
    })
    if (rpcError) {
      console.error('add_supervision_assignment:', rpcError.message)
      return { ok: false, error: 'Affectation impossible.' }
    }
    refetch()
    return { ok: true }
  }, [refetch])

  const remove = useCallback(async (id: string) => {
    const { error: rpcError } = await supabase.rpc('remove_supervision_assignment', { p_id: id })
    if (rpcError) {
      console.error('remove_supervision_assignment:', rpcError.message)
      return { ok: false, error: 'Retrait impossible.' }
    }
    refetch()
    return { ok: true }
  }, [refetch])

  return { assignments, loading, error, add, remove, refetch }
}
