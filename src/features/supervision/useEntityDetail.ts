import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface EntityMission {
  id: string
  name: string
  frameworkName: string
  cabinetName: string
  cabinetId: string
  status: string
  startDate: string | null
  endDate: string | null
  score: number
  totalControls: number
  approvedControls: number
  majorNcCount: number
  /** true if current user's org is the cabinet for this mission */
  canNavigate: boolean
}

export interface EntityDomainScore {
  code: string
  name: string
  score: number
  total: number
  approved: number
}

export interface EntityDetailData {
  entityId: string
  entityName: string
  sector: string | null
  city: string | null
  missions: EntityMission[]
  domainScores: EntityDomainScore[]
  globalScore: number
  totalMissions: number
  lastAuditDate: string | null
  openMajorNcs: number
  loading: boolean
  error: string | null
}

export function useEntityDetail(entityId: string | undefined): EntityDetailData {
  const { profile } = useAuth()
  const [data, setData] = useState<Omit<EntityDetailData, 'loading' | 'error'>>({
    entityId: '', entityName: '', sector: null, city: null,
    missions: [], domainScores: [], globalScore: 0,
    totalMissions: 0, lastAuditDate: null, openMajorNcs: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (): Promise<void> => {
    if (!entityId || !profile?.organization_id) { setLoading(false); return }
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch entity info
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name, sector, city')
        .eq('id', entityId)
        .single()

      if (orgErr || !org) {
        setError('Entit\u00e9 introuvable.')
        setLoading(false)
        return
      }

      // 2. Fetch all missions for this entity (RLS ensures group access)
      const { data: missions, error: mErr } = await supabase
        .from('missions')
        .select('id, name, status, start_date, end_date, cabinet_id, framework_id')
        .eq('client_id', entityId)
        .order('end_date', { ascending: false, nullsFirst: false })

      if (mErr) {
        setError('Impossible de charger les missions.')
        setLoading(false)
        return
      }

      if (!missions || missions.length === 0) {
        setData({
          entityId: org.id, entityName: org.name, sector: org.sector, city: org.city,
          missions: [], domainScores: [], globalScore: 0,
          totalMissions: 0, lastAuditDate: null, openMajorNcs: 0,
        })
        setLoading(false)
        return
      }

      // 3. Fetch framework names
      const frameworkIds = [...new Set(missions.map((m) => m.framework_id))]
      const { data: fwData } = await supabase
        .from('frameworks')
        .select('id, name')
        .in('id', frameworkIds)
      const fwMap = new Map((fwData ?? []).map((f) => [f.id, f.name]))

      // 4. Fetch cabinet names
      const cabinetIds = [...new Set(missions.map((m) => m.cabinet_id))]
      const { data: cabData } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', cabinetIds)
      const cabMap = new Map((cabData ?? []).map((c) => [c.id, c.name]))

      // 5. Fetch assessments for all missions
      const missionIds = missions.map((m) => m.id)
      const { data: assessments } = await supabase
        .from('control_assessments')
        .select('id, mission_id, control_id, status')
        .in('mission_id', missionIds)

      // 6. Fetch CARs
      const { data: cars } = await supabase
        .from('corrective_action_requests')
        .select('id, mission_id')
        .in('mission_id', missionIds)
        .eq('finding_classification', 'major_nc')
        .in('status', ['open', 'client_responded'])

      const carsByMission = new Map<string, number>()
      for (const car of cars ?? []) {
        carsByMission.set(car.mission_id, (carsByMission.get(car.mission_id) ?? 0) + 1)
      }

      // 7. Build mission list with scores
      const myOrgId = profile.organization_id
      const entityMissions: EntityMission[] = missions.map((m) => {
        const mAssessments = (assessments ?? []).filter((a) => a.mission_id === m.id)
        const total = mAssessments.length
        const approved = mAssessments.filter((a) => a.status === 'approved').length
        const score = total > 0 ? Math.round((approved / total) * 100) : 0

        return {
          id: m.id,
          name: m.name,
          frameworkName: fwMap.get(m.framework_id) ?? '',
          cabinetName: cabMap.get(m.cabinet_id) ?? '',
          cabinetId: m.cabinet_id,
          status: m.status,
          startDate: m.start_date,
          endDate: m.end_date,
          score,
          totalControls: total,
          approvedControls: approved,
          majorNcCount: carsByMission.get(m.id) ?? 0,
          canNavigate: m.cabinet_id === myOrgId,
        }
      })

      // 8. Aggregate domain scores from the latest mission (for the bar chart)
      const latestMission = missions[0]
      const latestAssessments = (assessments ?? []).filter((a) => a.mission_id === latestMission.id)

      // Get controls → domains for this framework
      const { data: domainData } = await supabase
        .from('domains')
        .select('id, code, name, sort_order')
        .eq('framework_id', latestMission.framework_id)
        .order('sort_order')

      const { data: controlData } = await supabase
        .from('controls')
        .select('id, domain_id')
        .in('domain_id', (domainData ?? []).map((d) => d.id))

      const ctrlToDomain = new Map((controlData ?? []).map((c) => [c.id, c.domain_id]))
      const domainIdToInfo = new Map((domainData ?? []).map((d) => [d.id, { code: d.code, name: d.name }]))

      const domainTotals = new Map<string, { code: string; name: string; total: number; approved: number }>()
      for (const a of latestAssessments) {
        const domainId = ctrlToDomain.get(a.control_id)
        if (!domainId) continue
        const info = domainIdToInfo.get(domainId)
        if (!info) continue
        const existing = domainTotals.get(info.code) ?? { code: info.code, name: info.name, total: 0, approved: 0 }
        existing.total++
        if (a.status === 'approved') existing.approved++
        domainTotals.set(info.code, existing)
      }

      const domainScores: EntityDomainScore[] = [...domainTotals.values()]
        .map((d) => ({ ...d, score: d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0 }))
        .sort((a, b) => a.code.localeCompare(b.code))

      // 9. Global stats
      const totalApproved = latestAssessments.filter((a) => a.status === 'approved').length
      const globalScore = latestAssessments.length > 0 ? Math.round((totalApproved / latestAssessments.length) * 100) : 0
      const totalOpenNcs = entityMissions.reduce((sum, m) => sum + m.majorNcCount, 0)

      setData({
        entityId: org.id,
        entityName: org.name,
        sector: org.sector,
        city: org.city,
        missions: entityMissions,
        domainScores,
        globalScore,
        totalMissions: entityMissions.length,
        lastAuditDate: missions[0]?.end_date ?? null,
        openMajorNcs: totalOpenNcs,
      })
    } catch (err) {
      console.error('useEntityDetail:', err)
      setError('Erreur lors du chargement.')
    } finally {
      setLoading(false)
    }
  }, [entityId, profile?.organization_id])

  useEffect(() => { fetchData() }, [fetchData])

  return { ...data, loading, error }
}
