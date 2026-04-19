import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

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
}

interface UseCreateMissionResult {
  createMission: (payload: CreateMissionPayload) => Promise<boolean>
  creating: boolean
  error: string | null
}

export function useCreateMission(onSuccess?: () => void): UseCreateMissionResult {
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createMission = useCallback(async (payload: CreateMissionPayload): Promise<boolean> => {
    setCreating(true)
    setError(null)

    const { data, error: fnError } = await supabase.functions.invoke('create-mission', {
      body: payload,
    })

    if (fnError) {
      let detail = fnError.message
      try {
        const context = (fnError as unknown as { context: { json: () => Promise<{ error?: string }> } }).context
        if (context?.json) {
          const body = await context.json()
          if (body?.error) detail = body.error
        }
      } catch {
        // pas de body json
      }
      console.error('useCreateMission:', detail)
      setError(detail)
      setCreating(false)
      return false
    }

    if (data?.error) {
      setError(data.error)
      setCreating(false)
      return false
    }

    setCreating(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { createMission, creating, error }
}
