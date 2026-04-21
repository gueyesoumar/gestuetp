import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

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
