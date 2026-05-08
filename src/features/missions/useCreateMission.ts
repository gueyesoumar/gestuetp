import { useState, useCallback } from 'react'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'
import type { MissionKind } from '../../types/database.types'

export interface CreateMissionPayload {
  name: string
  description: string
  cabinet_client_id: string
  framework_id: string
  lead_auditor_id: string
  associate_id: string
  start_date: string
  end_date: string
  member_ids: string[]
  kind?: MissionKind
}

interface UseCreateMissionResult {
  createMission: (payload: CreateMissionPayload) => Promise<{ ok: boolean; error?: string }>
  creating: boolean
}

export function useCreateMission(): UseCreateMissionResult {
  const [creating, setCreating] = useState(false)

  const createMission = useCallback(async (payload: CreateMissionPayload): Promise<{ ok: boolean; error?: string }> => {
    setCreating(true)
    const res = await invokeEdgeFunction('create-mission', payload as unknown as Record<string, unknown>)
    setCreating(false)
    if (!res.ok) {
      console.error('useCreateMission:', res.error)
      return { ok: false, error: res.error }
    }
    return { ok: true }
  }, [])

  return { createMission, creating }
}
