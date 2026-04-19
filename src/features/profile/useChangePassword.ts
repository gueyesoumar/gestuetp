import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

interface UseChangePasswordResult {
  changePassword: (newPassword: string) => Promise<boolean>
  changing: boolean
  error: string | null
}

export function useChangePassword(): UseChangePasswordResult {
  const [changing, setChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changePassword = useCallback(async (newPassword: string): Promise<boolean> => {
    setChanging(true)
    setError(null)

    if (newPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caract\u00e8res.')
      setChanging(false)
      return false
    }

    const { error: authError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (authError) {
      console.error('useChangePassword:', authError.message)
      setError('Impossible de changer le mot de passe.')
      setChanging(false)
      return false
    }

    setChanging(false)
    return true
  }, [])

  return { changePassword, changing, error }
}
