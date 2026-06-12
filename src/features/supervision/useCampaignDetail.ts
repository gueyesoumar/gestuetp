import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { AuditCampaign } from '../../types/database.types'

export interface CampaignEntityStatus {
  entityId: string
  entityName: string
  sector: string | null
  missionId: string
  missionStatus: string
  score: number
  totalControls: number
  approvedControls: number
  majorNcCount: number
}

export interface CampaignDetailData {
  campaign: AuditCampaign | null
  frameworkName: string
  entities: CampaignEntityStatus[]
  totalEntities: number
  completedEntities: number
  avgScore: number
  totalMajorNcs: number
  loading: boolean
  error: string | null
}

export function useCampaignDetail(campaignId: string | undefined): CampaignDetailData {
  const [campaign, setCampaign] = useState<AuditCampaign | null>(null)
  const [frameworkName, setFrameworkName] = useState('')
  const [entities, setEntities] = useState<CampaignEntityStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (!campaignId) { setLoading(false); return }
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch campaign
      const campQuery = supabase
        .from('audit_campaigns')
        .select('*')
        .eq('id', campaignId)
      const { data: campRaw, error: campErr } = await (signal ? campQuery.abortSignal(signal) : campQuery).single()
      if (signal?.aborted) return

      if (campErr || !campRaw) {
        setError('Campagne introuvable.')
        setLoading(false)
        return
      }
      const camp = campRaw as unknown as AuditCampaign
      setCampaign(camp)

      // 2. Framework name
      const fwQuery = supabase
        .from('frameworks')
        .select('name')
        .eq('id', camp.framework_id)
      const { data: fwRaw } = await (signal ? fwQuery.abortSignal(signal) : fwQuery).single()
      if (signal?.aborted) return
      const fw = fwRaw as { name: string } | null
      setFrameworkName(fw?.name ?? '')

      // 3. Fetch missions linked to this campaign
      type MissionRow = { id: string; client_id: string; status: string }
      const missionsQuery = supabase
        .from('missions')
        .select('id, client_id, status')
        .eq('campaign_id', campaignId)
      const { data: missionsRaw } = await (signal ? missionsQuery.abortSignal(signal) : missionsQuery)
      if (signal?.aborted) return

      const missions = (missionsRaw ?? []) as unknown as MissionRow[]
      if (missions.length === 0) {
        setEntities([])
        setLoading(false)
        return
      }

      // 4. Entity names
      const entityIds = [...new Set(missions.map((m) => m.client_id))]
      type OrgRow = { id: string; name: string; sector: string | null }
      const orgsQuery = supabase
        .from('organizations')
        .select('id, name, sector')
        .in('id', entityIds)
      const { data: orgsRaw } = await (signal ? orgsQuery.abortSignal(signal) : orgsQuery)
      if (signal?.aborted) return
      const orgs = (orgsRaw ?? []) as unknown as OrgRow[]
      const orgMap = new Map(orgs.map((o) => [o.id, { name: o.name, sector: o.sector }]))

      // 5. Assessments
      const missionIds = missions.map((m) => m.id)
      type AssessRow = { mission_id: string; status: string }
      const assessmentsQuery = supabase
        .from('control_assessments')
        .select('mission_id, status')
        .in('mission_id', missionIds)
      const { data: assessmentsRaw } = await (signal ? assessmentsQuery.abortSignal(signal) : assessmentsQuery)
      if (signal?.aborted) return
      const assessments = (assessmentsRaw ?? []) as unknown as AssessRow[]

      const missionScores = new Map<string, { total: number; approved: number }>()
      for (const a of assessments) {
        const entry = missionScores.get(a.mission_id) ?? { total: 0, approved: 0 }
        entry.total++
        if (a.status === 'approved') entry.approved++
        missionScores.set(a.mission_id, entry)
      }

      // 6. CARs
      type CarRow = { mission_id: string }
      const carsQuery = supabase
        .from('corrective_action_requests')
        .select('mission_id')
        .in('mission_id', missionIds)
        .eq('finding_classification', 'major_nc')
        .in('status', ['open', 'client_responded'])
      const { data: carsRaw } = await (signal ? carsQuery.abortSignal(signal) : carsQuery)
      if (signal?.aborted) return
      const cars = (carsRaw ?? []) as unknown as CarRow[]

      const carsByMission = new Map<string, number>()
      for (const car of cars) {
        carsByMission.set(car.mission_id, (carsByMission.get(car.mission_id) ?? 0) + 1)
      }

      // 7. Build entity statuses
      const result: CampaignEntityStatus[] = missions.map((m) => {
        const org = orgMap.get(m.client_id)
        const scores = missionScores.get(m.id) ?? { total: 0, approved: 0 }
        const score = scores.total > 0 ? Math.round((scores.approved / scores.total) * 100) : 0

        return {
          entityId: m.client_id,
          entityName: org?.name ?? 'Entit\u00e9 inconnue',
          sector: org?.sector ?? null,
          missionId: m.id,
          missionStatus: m.status,
          score,
          totalControls: scores.total,
          approvedControls: scores.approved,
          majorNcCount: carsByMission.get(m.id) ?? 0,
        }
      })

      result.sort((a, b) => b.score - a.score)
      setEntities(result)
      setLoading(false)
    } catch (err) {
      if (signal?.aborted) return
      console.error('useCampaignDetail:', err)
      setError('Erreur lors du chargement.')
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    const ac = new AbortController()
    void fetchData(ac.signal)
    return () => ac.abort()
  }, [fetchData])

  const completedStatuses = new Set(['closure', 'client_review', 'internal_review'])
  const completedEntities = entities.filter((e) => completedStatuses.has(e.missionStatus)).length
  const scores = entities.filter((e) => e.totalControls > 0).map((e) => e.score)
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const totalMajorNcs = entities.reduce((sum, e) => sum + e.majorNcCount, 0)

  return {
    campaign, frameworkName, entities,
    totalEntities: entities.length,
    completedEntities, avgScore, totalMajorNcs,
    loading, error,
  }
}
