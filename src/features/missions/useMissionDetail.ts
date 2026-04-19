import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Mission, Framework, Organization, User } from '../../types/database.types'
import type { MemberWithRoles } from '../members/types'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'
import type { Control } from '../../types/database.types'

export interface MissionDetail extends Mission {
  framework: Framework
  client: Organization
  cabinet: Organization
  lead_auditor_user: Pick<User, 'id' | 'first_name' | 'last_name'> | null
  associate_user: Pick<User, 'id' | 'first_name' | 'last_name'> | null
}

export interface MissionMemberRow {
  id: string
  user_id: string
  role: string
  user: Pick<User, 'id' | 'first_name' | 'last_name' | 'email' | 'job_title'>
}

export interface ControlAssignmentRow {
  id: string
  control_id: string
  auditor_id: string
  control: Control
  auditor: Pick<User, 'id' | 'first_name' | 'last_name'>
}

interface UseMissionDetailResult {
  mission: MissionDetail | null
  members: MissionMemberRow[]
  assignments: ControlAssignmentRow[]
  domains: DomainWithControls[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useMissionDetail(missionId: string | undefined): UseMissionDetailResult {
  const [mission, setMission] = useState<MissionDetail | null>(null)
  const [members, setMembers] = useState<MissionMemberRow[]>([])
  const [assignments, setAssignments] = useState<ControlAssignmentRow[]>([])
  const [domains, setDomains] = useState<DomainWithControls[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    const fetchAll = async () => {
      // 1. Mission avec relations
      const { data: missionData, error: mErr } = await supabase
        .from('missions')
        .select(`
          *,
          framework:frameworks(*),
          client:organizations!missions_client_id_fkey(*),
          cabinet:organizations!missions_cabinet_id_fkey(*),
          lead_auditor_user:users!missions_lead_auditor_id_fkey(id, first_name, last_name),
          associate_user:users!missions_associate_id_fkey(id, first_name, last_name)
        `)
        .eq('id', missionId)
        .single()
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return
      if (mErr || !missionData) {
        console.error('useMissionDetail mission:', mErr?.message)
        setError('Mission introuvable.')
        setLoading(false)
        return
      }

      setMission(missionData as unknown as MissionDetail)

      // 2. Membres
      const { data: membersData, error: memErr } = await supabase
        .from('mission_members')
        .select('id, user_id, role, user:users!mission_members_user_id_fkey(id, first_name, last_name, email, job_title)')
        .eq('mission_id', missionId)
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return
      if (!memErr) {
        setMembers((membersData ?? []) as unknown as MissionMemberRow[])
      }

      // 3. Domaines et controles du referentiel
      const frameworkId = (missionData as unknown as MissionDetail).framework?.id
      if (frameworkId) {
        const { data: domainsData, error: domErr } = await supabase
          .from('domains')
          .select('*, controls(*)')
          .eq('framework_id', frameworkId)
          .order('sort_order')
          .abortSignal(abortController.signal)

        if (abortController.signal.aborted) return
        if (!domErr) {
          const mapped = (domainsData ?? []).map((d) => ({
            ...d,
            controls: ((d.controls ?? []) as Control[]).sort(
              (a, b) => a.sort_order - b.sort_order
            ),
          }))
          setDomains(mapped as DomainWithControls[])
        }
      }

      // 4. Affectations controles
      const { data: assignData, error: assErr } = await supabase
        .from('mission_control_assignments')
        .select('id, control_id, auditor_id, control:controls(*), auditor:users!mission_control_assignments_auditor_id_fkey(id, first_name, last_name)')
        .eq('mission_id', missionId)
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return
      if (!assErr) {
        setAssignments((assignData ?? []) as unknown as ControlAssignmentRow[])
      }

      setLoading(false)
    }

    fetchAll()
    return () => abortController.abort()
  }, [missionId, refreshKey])

  return { mission, members, assignments, domains, loading, error, refetch }
}
