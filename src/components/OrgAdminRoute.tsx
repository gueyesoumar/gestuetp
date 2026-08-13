import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useCabinetPermissions } from '../hooks/useCabinetPermissions'
import { LoadingSpinner } from './ui/LoadingSpinner'

/**
 * Garde des pages réservées à l'admin d'organisation (permission
 * can_view_audit_trail ; is_platform_owner = override via ALL_TRUE). Redirige
 * vers l'accueil si l'accès n'est pas accordé.
 */
export function OrgAdminRoute({ children }: { children: ReactNode }): JSX.Element {
  const { canViewAuditTrail, loading } = useCabinetPermissions()
  if (loading) return <LoadingSpinner />
  if (!canViewAuditTrail) return <Navigate to="/" replace />
  return <>{children}</>
}
