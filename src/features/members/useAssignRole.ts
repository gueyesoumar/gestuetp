import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

interface AssignRoleParams {
  user_id: string
  role_id: string
  remove_role_id?: string
}

interface UseAssignRoleResult {
  assignRole: (params: AssignRoleParams) => Promise<boolean>
  assigning: boolean
  error: string | null
}

export function useAssignRole(onSuccess?: () => void): UseAssignRoleResult {
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assignRole = useCallback(async (params: AssignRoleParams): Promise<boolean> => {
    setAssigning(true)
    setError(null)

    const { data, error: fnError } = await supabase.functions.invoke('assign-role', {
      body: params,
    })

    if (fnError) {
      console.error('useAssignRole:', fnError.message)
      setError('Erreur lors de l\u2019attribution du r\u00f4le.')
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

  return { assignRole, assigning, error }
}
