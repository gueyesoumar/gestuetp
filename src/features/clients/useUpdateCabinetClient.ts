import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { CabinetClientUpdate } from '../../types/database.types'

interface UseUpdateCabinetClientResult {
  updateClient: (id: string, data: CabinetClientUpdate) => Promise<boolean>
  updating: boolean
  error: string | null
}

export function useUpdateCabinetClient(onSuccess?: () => void): UseUpdateCabinetClientResult {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateClient = useCallback(async (id: string, data: CabinetClientUpdate): Promise<boolean> => {
    setUpdating(true)
    setError(null)

    const { error: queryError } = await supabase
      .from('cabinet_clients')
      .update(data)
      .eq('id', id)

    if (queryError) {
      console.error('useUpdateCabinetClient:', queryError.message)
      setError('Impossible de mettre à jour le client.')
      setUpdating(false)
      return false
    }

    setUpdating(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { updateClient, updating, error }
}
