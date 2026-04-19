import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

interface AssignEntry {
  control_id: string
  auditor_id: string
}

interface UseAssignControlsResult {
  assignControls: (missionId: string, entries: AssignEntry[]) => Promise<boolean>
  assigning: boolean
  error: string | null
}

export function useAssignControls(onSuccess?: () => void): UseAssignControlsResult {
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assignControls = useCallback(async (missionId: string, entries: AssignEntry[]): Promise<boolean> => {
    setAssigning(true)
    setError(null)

    const { data, error: fnError } = await supabase.functions.invoke('assign-controls', {
      body: { mission_id: missionId, assignments: entries },
    })

    if (fnError) {
      let detail = fnError.message
      try {
        const context = (fnError as unknown as { context: { json: () => Promise<{ error?: string }> } }).context
        if (context?.json) {
          const body = await context.json()
          if (body?.error) detail = body.error
        }
      } catch { /* */ }
      setError(detail)
      setAssigning(false)
      return false
    }

    if (data?.error) {
      setError(data.error)
      setAssigning(false)
      return false
    }

    setAssigning(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { assignControls, assigning, error }
}
