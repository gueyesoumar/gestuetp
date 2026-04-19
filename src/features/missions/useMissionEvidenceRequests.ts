import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { MissionEvidenceRequest } from '../../types/database.types'

interface UseMissionEvidenceRequestsResult {
  requests: MissionEvidenceRequest[]
  requestedIds: Set<string>
  loading: boolean
  error: string | null
  requestEvidence: (missionId: string, evidenceCatalogIds: string[]) => Promise<boolean>
  requesting: boolean
  refetch: () => void
}

export function useMissionEvidenceRequests(missionId: string | undefined): UseMissionEvidenceRequestsResult {
  const [requests, setRequests] = useState<MissionEvidenceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)

    supabase
      .from('mission_evidence_requests')
      .select('*')
      .eq('mission_id', missionId)
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useMissionEvidenceRequests:', queryError.message)
          setError('Impossible de charger les demandes de preuves.')
        } else {
          setRequests(data ?? [])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [missionId, refreshKey])

  const requestEvidence = useCallback(async (mId: string, evidenceCatalogIds: string[]): Promise<boolean> => {
    setRequesting(true)

    const { data, error: fnError } = await supabase.functions.invoke('request-evidence', {
      body: { mission_id: mId, evidence_catalog_ids: evidenceCatalogIds },
    })

    if (fnError) {
      console.error('requestEvidence:', fnError.message)
      setRequesting(false)
      return false
    }

    if (data?.error) {
      console.error('requestEvidence:', data.error)
      setRequesting(false)
      return false
    }

    setRequesting(false)
    refetch()
    return true
  }, [refetch])

  const requestedIds = new Set(requests.map((r) => r.evidence_catalog_id))

  return { requests, requestedIds, loading, error, requestEvidence, requesting, refetch }
}
