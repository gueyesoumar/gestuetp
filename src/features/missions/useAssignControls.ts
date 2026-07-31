import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'

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
      const detail = await readInvokeError(fnError, data, 'Affectation impossible')
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
