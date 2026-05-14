import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { OrganizationUpdate } from '../../types/database.types'

interface UseUpdateOrganizationResult {
  updateOrganization: (id: string, data: OrganizationUpdate) => Promise<boolean>
  updating: boolean
  error: string | null
}

export function useUpdateOrganization(onSuccess?: () => void): UseUpdateOrganizationResult {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateOrganization = useCallback(async (id: string, data: OrganizationUpdate): Promise<boolean> => {
    setUpdating(true)
    setError(null)

    const { error: queryError } = await supabase
      .from('organizations')
      .update(data as never)
      .eq('id', id)

    if (queryError) {
      console.error('useUpdateOrganization:', queryError.message)
      setError('Impossible de mettre \u00e0 jour l\u2019organisation.')
      setUpdating(false)
      return false
    }

    setUpdating(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { updateOrganization, updating, error }
}
