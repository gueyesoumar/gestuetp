import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { AuditCampaign, AuditCampaignInsert, CampaignStatus } from '../../types/database.types'

export interface CampaignSummary extends AuditCampaign {
  frameworkName: string
  totalEntities: number
  completedEntities: number
  avgScore: number
}

interface UseAuditCampaignsReturn {
  campaigns: CampaignSummary[]
  loading: boolean
  error: string | null
  createCampaign: (data: AuditCampaignInsert, entityIds: string[]) => Promise<string | null>
  creating: boolean
  updateStatus: (campaignId: string, status: CampaignStatus) => Promise<boolean>
  refetch: () => void
}

export function useAuditCampaigns(): UseAuditCampaignsReturn {
  const { profile } = useAuth()
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!profile?.organization_id) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchData = async (): Promise<void> => {
      // 1. Fetch campaigns
      const { data: campData, error: campErr } = await supabase
        .from('audit_campaigns')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('period_start', { ascending: false })
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return
      if (campErr) {
        setError('Impossible de charger les campagnes.')
        setLoading(false)
        return
      }

      if (!campData || campData.length === 0) {
        setCampaigns([])
        setLoading(false)
        return
      }

      // 2. Fetch framework names
      const fwIds = [...new Set(campData.map((c) => c.framework_id))]
      const { data: fwData } = await supabase
        .from('frameworks')
        .select('id, name')
        .in('id', fwIds)
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return
      const fwMap = new Map((fwData ?? []).map((f) => [f.id, f.name]))

      // 3. Fetch missions linked to campaigns for stats
      const campIds = campData.map((c) => c.id)
      const { data: missionData } = await supabase
        .from('missions')
        .select('id, campaign_id, client_id, status')
        .in('campaign_id', campIds)
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return

      // 4. Fetch assessment scores for completed missions
      const completedMissionIds = (missionData ?? [])
        .filter((m) => m.status === 'closure' || m.status === 'client_review' || m.status === 'internal_review')
        .map((m) => m.id)

      let scoresByMission = new Map<string, number>()
      if (completedMissionIds.length > 0) {
        const { data: assessments } = await supabase
          .from('control_assessments')
          .select('mission_id, status')
          .in('mission_id', completedMissionIds)
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return

        // Group by mission, compute score
        const missionTotals = new Map<string, { total: number; approved: number }>()
        for (const a of assessments ?? []) {
          const entry = missionTotals.get(a.mission_id) ?? { total: 0, approved: 0 }
          entry.total++
          if (a.status === 'approved') entry.approved++
          missionTotals.set(a.mission_id, entry)
        }
        for (const [mid, { total, approved }] of missionTotals) {
          scoresByMission.set(mid, total > 0 ? Math.round((approved / total) * 100) : 0)
        }
      }

      // 5. Build summaries
      const results: CampaignSummary[] = campData.map((camp) => {
        const campMissions = (missionData ?? []).filter((m) => m.campaign_id === camp.id)
        const entityIds = new Set(campMissions.map((m) => m.client_id))
        const completedMissions = campMissions.filter((m) =>
          m.status === 'closure' || m.status === 'client_review' || m.status === 'internal_review'
        )

        const scores = completedMissions
          .map((m) => scoresByMission.get(m.id))
          .filter((s): s is number => s !== undefined)
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0

        return {
          ...camp,
          frameworkName: fwMap.get(camp.framework_id) ?? '',
          totalEntities: entityIds.size,
          completedEntities: new Set(completedMissions.map((m) => m.client_id)).size,
          avgScore,
        }
      })

      setCampaigns(results)
      setLoading(false)
    }

    fetchData()
    return () => controller.abort()
  }, [profile?.organization_id, refreshKey])

  const createCampaign = useCallback(async (data: AuditCampaignInsert, entityIds: string[]): Promise<string | null> => {
    if (!profile?.organization_id) return null
    setCreating(true)

    // 1. Create the campaign
    const { data: campaign, error: campErr } = await supabase
      .from('audit_campaigns')
      .insert(data)
      .select('id')
      .single()

    if (campErr || !campaign) {
      console.error('createCampaign:', campErr?.message)
      setCreating(false)
      return null
    }

    const campaignId = campaign.id

    // 2. Create missions for each entity (direct INSERT, requires policy 00060)
    const missions = entityIds.map((entityId) => ({
      cabinet_id: profile.organization_id,
      client_id: entityId,
      framework_id: data.framework_id,
      name: data.name,
      status: 'initialization' as const,
      campaign_id: campaignId,
      start_date: data.period_start,
      end_date: data.period_end,
    }))

    const { error: mErr } = await supabase
      .from('missions')
      .insert(missions)

    if (mErr) {
      console.error('createCampaign missions:', mErr.message)
    }

    // 3. Activate the campaign
    await supabase
      .from('audit_campaigns')
      .update({ status: 'active' as CampaignStatus })
      .eq('id', campaignId)

    setCreating(false)
    refetch()
    return campaignId
  }, [profile?.organization_id, refetch])

  const updateStatus = useCallback(async (campaignId: string, status: CampaignStatus): Promise<boolean> => {
    const { error: err } = await supabase
      .from('audit_campaigns')
      .update({ status })
      .eq('id', campaignId)

    if (err) {
      console.error('updateCampaignStatus:', err.message)
      return false
    }
    refetch()
    return true
  }, [refetch])

  return { campaigns, loading, error, createCampaign, creating, updateStatus, refetch }
}
