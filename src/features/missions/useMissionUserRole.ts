import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { MissionDetail } from './useMissionDetail'

/**
 * Détermine le rôle de l'utilisateur courant dans une mission donnée et,
 * pour les auditeurs (ni lead, ni associate), récupère la liste des
 * contrôles qui leur sont assignés.
 *
 * Utilisé pour :
 *   - filtrer les onglets visibles dans MissionDetailPage / MissionStepper
 *     (les auditeurs n'ont pas accès à Scoping, Planning, Internal/Client Review)
 *   - filtrer les contrôles affichés dans Overview, Fieldwork, Closure
 *
 * Le RLS en BDD (migration 00091) impose la même restriction au niveau
 * gateway PostgREST. Ce hook est la couche UI cohérente.
 */

export type MissionRoleScope = 'lead' | 'associate' | 'auditor' | 'unknown'

export interface MissionUserRole {
  role: MissionRoleScope
  isLead: boolean
  isAssociate: boolean
  isAuditor: boolean
  /** Privileged = lead OU associate. Voient tout, peuvent piloter. */
  isPrivileged: boolean
  /** IDs des contrôles auxquels l'auditeur est assigné. Vide si privileged (utiliser tous les domaines). */
  assignedControlIds: Set<string>
  loading: boolean
}

export function useMissionUserRole(
  mission: MissionDetail | null,
): MissionUserRole {
  const { profile } = useAuth()
  const [assignedControlIds, setAssignedControlIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const isLead = !!profile && profile.id === mission?.lead_auditor_id
  const isAssociate = !!profile && profile.id === mission?.associate_id
  const isPrivileged = isLead || isAssociate
  const isAuditor = !!profile && !!mission && !isPrivileged
  const role: MissionRoleScope = isLead ? 'lead' : isAssociate ? 'associate' : isAuditor ? 'auditor' : 'unknown'

  useEffect(() => {
    if (!mission || !profile) {
      setLoading(false)
      return
    }
    if (isPrivileged) {
      setAssignedControlIds(new Set())
      setLoading(false)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    supabase
      .from('mission_control_assignments')
      .select('control_id')
      .eq('mission_id', mission.id)
      .eq('auditor_id', profile.id)
      .abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) {
          console.error('useMissionUserRole:', error.message)
          setAssignedControlIds(new Set())
        } else {
          setAssignedControlIds(new Set((data ?? []).map((r) => (r as { control_id: string }).control_id)))
        }
        setLoading(false)
      })
    return () => ac.abort()
  }, [mission, profile, isPrivileged])

  return {
    role,
    isLead,
    isAssociate,
    isAuditor,
    isPrivileged,
    assignedControlIds,
    loading,
  }
}
