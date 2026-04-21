import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { MemberAuditLog } from './types'

interface UseMemberAuditLogResult {
  logs: MemberAuditLog[]
  loading: boolean
  error: string | null
}

export function useMemberAuditLog(userId: string): UseMemberAuditLogResult {
  const [logs, setLogs] = useState<MemberAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    supabase
      .from('member_audit_logs')
      .select('*, performer:users!member_audit_logs_performed_by_fkey(first_name, last_name)')
      .eq('target_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          // Table may not exist yet if migration hasn't been run
          console.warn('useMemberAuditLog:', queryError.message)
          setLogs([])
        } else {
          setLogs((data ?? []) as MemberAuditLog[])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [userId])

  return { logs, loading, error }
}
