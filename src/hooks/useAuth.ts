import { useContext } from 'react'
import { AuthContext } from '../features/auth/AuthContext'
import type { AuthState } from '../features/auth/AuthContext'

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}
