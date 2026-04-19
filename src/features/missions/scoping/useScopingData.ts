import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { MissionExclusion, MissionRisk, AuditHistoryEntry } from '../../../types/database.types'

// Helper: Supabase generated types resolve to `never` for new tables
type QueryResult = { data: unknown[] | null; error: { message: string } | null }

function queryTable(name: string) {
  return supabase.from(name as 'missions')
}

interface UseScopingDataResult {
  exclusions: MissionExclusion[]
  risks: MissionRisk[]
  auditHistory: AuditHistoryEntry[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useScopingData(missionId: string | undefined, cabinetClientId: string | undefined): UseScopingDataResult {
  const [exclusions, setExclusions] = useState<MissionExclusion[]>([])
  const [risks, setRisks] = useState<MissionRisk[]>([])
  const [auditHistory, setAuditHistory] = useState<AuditHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) { setLoading(false); return }

    const ac = new AbortController()
    setLoading(true)
    setError(null)

    const fetchAll = async () => {
      const exRes = await queryTable('mission_exclusions').select('*').eq('mission_id', missionId).abortSignal(ac.signal) as unknown as QueryResult
      const riskRes = await queryTable('mission_risks').select('*').eq('mission_id', missionId).order('created_at').abortSignal(ac.signal) as unknown as QueryResult

      let histRes: QueryResult | null = null
      if (cabinetClientId) {
        histRes = await queryTable('audit_history').select('*').eq('cabinet_client_id', cabinetClientId).order('year', { ascending: false }).abortSignal(ac.signal) as unknown as QueryResult
      }

      if (ac.signal.aborted) return

      if (exRes.error) console.error('useScopingData exclusions:', exRes.error.message)
      if (riskRes.error) console.error('useScopingData risks:', riskRes.error.message)

      setExclusions((exRes.data ?? []) as unknown as MissionExclusion[])
      setRisks((riskRes.data ?? []) as unknown as MissionRisk[])
      if (histRes) setAuditHistory((histRes.data ?? []) as unknown as AuditHistoryEntry[])
      setLoading(false)
    }

    fetchAll()
    return () => ac.abort()
  }, [missionId, cabinetClientId, refreshKey])

  return { exclusions, risks, auditHistory, loading, error, refetch }
}
