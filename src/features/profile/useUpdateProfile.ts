import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { UserUpdate } from '../../types/database.types'

interface UseUpdateProfileResult {
  updateProfile: (id: string, data: UserUpdate) => Promise<boolean>
  updating: boolean
  error: string | null
}

export function useUpdateProfile(onSuccess?: () => void): UseUpdateProfileResult {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = useCallback(async (id: string, data: UserUpdate): Promise<boolean> => {
    setUpdating(true)
    setError(null)

    const { error: queryError } = await supabase
      .from('users')
      .update(data as never)
      .eq('id', id)

    if (queryError) {
      console.error('useUpdateProfile:', queryError.message)
      setError('Impossible de mettre \u00e0 jour le profil.')
      setUpdating(false)
      return false
    }

    setUpdating(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { updateProfile, updating, error }
}
