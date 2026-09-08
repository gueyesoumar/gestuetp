import { useState, useCallback } from 'react'
import { invokeEdgeFunction } from '../../lib/invokeEdgeFunction'

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

    // L'edge `set-password` valide contre la politique plateforme (longueur,
    // complexité, interdits, HIBP) puis pose le mot de passe via service_role.
    const res = await invokeEdgeFunction('set-password', { password: newPassword })
    if (!res.ok) {
      setError(res.error ?? 'Impossible de changer le mot de passe.')
      setChanging(false)
      return false
    }

    setChanging(false)
    return true
  }, [])

  return { changePassword, changing, error }
}
