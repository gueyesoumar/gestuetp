import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LoadingSpinner } from './ui/LoadingSpinner'
import type { ReactNode } from 'react'

interface AdminProtectedRouteProps {
  children: ReactNode
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
  const { profile, loading } = useAuth()

  if (loading) return <LoadingSpinner />
  if (!profile) return <Navigate to="/login" replace />
  if (!profile.is_platform_owner) return <Navigate to="/" replace />

  return <>{children}</>
}
