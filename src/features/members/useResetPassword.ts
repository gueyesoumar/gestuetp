import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'

interface UseResetPasswordResult {
  resetPassword: (userId: string, newPassword: string) => Promise<boolean>
  resetting: boolean
  error: string | null
}

export function useResetPassword(onSuccess?: () => void): UseResetPasswordResult {
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetPassword = useCallback(async (userId: string, newPassword: string): Promise<boolean> => {
    setResetting(true)
    setError(null)

    const { data, error: fnError } = await supabase.functions.invoke('reset-user-password', {
      body: { user_id: userId, new_password: newPassword },
    })

    if (fnError) {
      const detail = await readInvokeError(fnError, data, 'Réinitialisation impossible')
      console.error('useResetPassword:', detail)
      setError(detail)
      setResetting(false)
      return false
    }

    if (data?.error) {
      setError(data.error)
      setResetting(false)
      return false
    }

    setResetting(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { resetPassword, resetting, error }
}
