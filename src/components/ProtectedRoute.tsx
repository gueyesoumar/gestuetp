import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'
import { FullscreenLoader } from './FullscreenLoader'

export function ProtectedRoute({ children }: { children: ReactNode }): JSX.Element {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <FullscreenLoader />
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Redirect clients to their portal
  if (profile && profile.role === 'client') {
    return <Navigate to="/client" replace />
  }

  return <>{children}</>
}
