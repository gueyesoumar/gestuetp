import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface CabinetAuditLogRow {
  id: string
  action: string
  target_type: string
  target_id: string | null
  reason: string
  metadata: Record<string, unknown> | null
  created_at: string
  actor_email: string
  actor_first_name: string
  actor_last_name: string
}

interface Result {
  rows: CabinetAuditLogRow[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Charge l'audit log filtré sur un cabinet (target_id direct sur l'organisation
 * OU target_id pointant sur un user de cette organisation).
 *
 * Pour la couverture complète sans coût excessif, on charge :
 *  1. Les actions où target_type='organization' AND target_id=cabinetId
 *  2. Les actions où target_type='user' AND target_id IN (membres du cabinet)
 */
export function useCabinetAuditLog(cabinetId: string | undefined): Result {
  const [rows, setRows] = useState<CabinetAuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!cabinetId) {
      setLoading(false)
      return
    }

    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      // 1. Membres du cabinet pour étendre la recherche aux actions sur ses users
      const { data: members } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', cabinetId)
        .abortSignal(abort.signal)
      const memberIds = ((members ?? []) as Array<{ id: string }>).map((m) => m.id)

      // 2. Actions concernant l'organisation OU un de ses membres
      const orList = [`and(target_type.eq.organization,target_id.eq.${cabinetId})`]
      if (memberIds.length > 0) {
        orList.push(`and(target_type.eq.user,target_id.in.(${memberIds.join(',')}))`)
      }

      const { data, error: queryError } = await supabase
        .from('admin_audit_log')
        .select('id, action, target_type, target_id, reason, metadata, created_at, actor:users!admin_audit_log_actor_id_fkey(email, first_name, last_name)')
        .or(orList.join(','))
        .order('created_at', { ascending: false })
        .limit(200)
        .abortSignal(abort.signal)

      if (abort.signal.aborted) return
      if (queryError) {
        console.error('useCabinetAuditLog:', queryError.message)
        setError('Chargement de l\'audit log impossible')
        setLoading(false)
        return
      }

      const items = (data ?? []) as Array<Record<string, unknown> & { actor: { email: string; first_name: string; last_name: string } | null }>
      setRows(items.map((r) => ({
        id: r.id as string,
        action: r.action as string,
        target_type: r.target_type as string,
        target_id: r.target_id as string | null,
        reason: r.reason as string,
        metadata: r.metadata as Record<string, unknown> | null,
        created_at: r.created_at as string,
        actor_email: r.actor?.email ?? '—',
        actor_first_name: r.actor?.first_name ?? '—',
        actor_last_name: r.actor?.last_name ?? '',
      })))
      setLoading(false)
    })()

    return () => abort.abort()
  }, [cabinetId, tick])

  return { rows, loading, error, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
