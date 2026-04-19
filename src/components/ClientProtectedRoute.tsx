import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'

export function ClientProtectedRoute({ children }: { children: ReactNode }): JSX.Element {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Chargement...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Rediriger les auditeurs vers le back-office
  if (profile && profile.role !== 'client') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
