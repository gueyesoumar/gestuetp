import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Framework } from '../../types/database.types'

export type SupervisionMode = 'cabinet' | 'group'

export interface EntityScore {
  clientId: string
  clientName: string
  sector: string
  missionId: string
  missionName: string
  lastAuditDate: string | null
  globalScore: number
  domainScores: Record<string, number>
  totalControls: number
  approvedControls: number
  majorNcCount: number
  /** Nom du cabinet ayant réalisé l'audit (utile en mode groupe) */
  cabinetName: string | null
}

export interface SupervisionData {
  frameworks: Framework[]
  entities: EntityScore[]
  domains: { code: string; name: string; sortOrder: number }[]
  loading: boolean
  error: string | null
}

export function useSupervisionData(frameworkId: string, mode: SupervisionMode = 'cabinet'): SupervisionData {
  const { profile } = useAuth()
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [entities, setEntities] = useState<EntityScore[]>([])
  const [domains, setDomains] = useState<{ code: string; name: string; sortOrder: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all active frameworks (for the selector)
  useEffect(() => {
    supabase
      .from('frameworks')
      .select('*')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error: err }) => {
        if (err) console.warn('useSupervisionData frameworks:', err.message)
        setFrameworks(data ?? [])
      })
  }, [])

  // Fetch supervision data for the selected framework
  const fetchData = useCallback(async () => {
    if (!profile?.organization_id || !frameworkId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Fetch domains for this framework
      const { data: domainData, error: domainErr } = await supabase
        .from('domains')
        .select('id, code, name, sort_order')
        .eq('framework_id', frameworkId)
        .order('sort_order')

      if (domainErr) {
        console.error('supervision domains:', domainErr.message)
        setError('Impossible de charger les domaines.')
        setLoading(false)
        return
      }

      setDomains((domainData ?? []).map((d) => ({ code: d.code, name: d.name, sortOrder: d.sort_order })))

      // 2. Fetch controls for this framework (via domains)
      const domainIds = (domainData ?? []).map((d) => d.id)
      if (domainIds.length === 0) {
        setEntities([])
        setLoading(false)
        return
      }

      const { data: controlData } = await supabase
        .from('controls')
        .select('id, domain_id')
        .in('domain_id', domainIds)

      const controlToDomain = new Map<string, string>()
      const domainIdToCode = new Map<string, string>()
      for (const d of domainData ?? []) {
        domainIdToCode.set(d.id, d.code)
      }
      for (const c of controlData ?? []) {
        controlToDomain.set(c.id, c.domain_id)
      }

      // 3. Fetch missions — different query depending on mode
      let missionQuery = supabase
        .from('missions')
        .select('id, name, status, client_id, cabinet_id, end_date, framework_id')
        .eq('framework_id', frameworkId)

      if (mode === 'cabinet') {
        // Cabinet mode: missions where this org is the auditing cabinet
        missionQuery = missionQuery.eq('cabinet_id', profile.organization_id)
      } else {
        // Group mode: missions where client is a subsidiary
        // The RLS policy "missions_select_group" handles access control.
        // We need to get subsidiary IDs first, then filter.
        const { data: subIds } = await supabase
          .rpc('get_subsidiary_ids', { parent_id: profile.organization_id })

        if (!subIds || (subIds as string[]).length === 0) {
          setEntities([])
          setLoading(false)
          return
        }

        missionQuery = missionQuery.in('client_id', subIds as string[])
      }

      const { data: missionData, error: missionErr } = await missionQuery

      if (missionErr) {
        console.error('supervision missions:', missionErr.message)
        setError('Impossible de charger les missions.')
        setLoading(false)
        return
      }

      if (!missionData || missionData.length === 0) {
        setEntities([])
        setLoading(false)
        return
      }

      // 4. Fetch client info (entity names)
      const clientOrgIds = [...new Set(missionData.map((m) => m.client_id))]
      const { data: clientData } = await supabase
        .from('cabinet_clients')
        .select('id, client_org_id, client_name, client_sector')
        .in('client_org_id', clientOrgIds)

      const clientMap = new Map<string, { nom: string; secteur: string }>()
      for (const c of clientData ?? []) {
        if (c.client_org_id) {
          clientMap.set(c.client_org_id, { nom: c.client_name, secteur: c.client_sector ?? '' })
        }
      }

      // Fallback: fetch from organizations for entities not in cabinet_clients
      const missingOrgIds = clientOrgIds.filter((id) => !clientMap.has(id))
      if (missingOrgIds.length > 0) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name, sector')
          .in('id', missingOrgIds)
        for (const o of orgData ?? []) {
          clientMap.set(o.id, { nom: o.name, secteur: o.sector ?? '' })
        }
      }

      // 4b. In group mode, also fetch cabinet names for each mission
      const cabinetNameMap = new Map<string, string>()
      if (mode === 'group') {
        const cabinetIds = [...new Set(missionData.map((m) => m.cabinet_id))]
        if (cabinetIds.length > 0) {
          const { data: cabData } = await supabase
            .from('organizations')
            .select('id, name')
            .in('id', cabinetIds)
          for (const c of cabData ?? []) {
            cabinetNameMap.set(c.id, c.name)
          }
        }
      }

      // 5. Fetch all assessments for these missions
      const missionIds = missionData.map((m) => m.id)
      const { data: assessmentData } = await supabase
        .from('control_assessments')
        .select('id, mission_id, control_id, status')
        .in('mission_id', missionIds)

      // 6. Fetch CARs for major NC count
      const { data: carData } = await supabase
        .from('corrective_action_requests')
        .select('id, mission_id, finding_classification, status')
        .in('mission_id', missionIds)
        .eq('finding_classification', 'major_nc')
        .in('status', ['open', 'client_responded'])

      const carsByMission = new Map<string, number>()
      for (const car of carData ?? []) {
        carsByMission.set(car.mission_id, (carsByMission.get(car.mission_id) ?? 0) + 1)
      }

      // 7. Aggregate per client (use latest mission per client)
      const latestMissionByClient = new Map<string, typeof missionData[0]>()
      for (const m of missionData) {
        const existing = latestMissionByClient.get(m.client_id)
        if (!existing || (m.end_date && (!existing.end_date || m.end_date > existing.end_date))) {
          latestMissionByClient.set(m.client_id, m)
        }
      }

      const results: EntityScore[] = []

      for (const [clientId, mission] of latestMissionByClient) {
        const client = clientMap.get(clientId)
        const missionAssessments = (assessmentData ?? []).filter((a) => a.mission_id === mission.id)

        // Count per domain
        const domainTotal = new Map<string, number>()
        const domainApproved = new Map<string, number>()

        for (const a of missionAssessments) {
          const domainId = controlToDomain.get(a.control_id)
          if (!domainId) continue
          const code = domainIdToCode.get(domainId) ?? ''

          domainTotal.set(code, (domainTotal.get(code) ?? 0) + 1)
          if (a.status === 'approved') {
            domainApproved.set(code, (domainApproved.get(code) ?? 0) + 1)
          }
        }

        const domainScores: Record<string, number> = {}
        for (const d of domainData ?? []) {
          const total = domainTotal.get(d.code) ?? 0
          const approved = domainApproved.get(d.code) ?? 0
          domainScores[d.code] = total > 0 ? Math.round((approved / total) * 100) : 0
        }

        const totalControls = missionAssessments.length
        const approvedControls = missionAssessments.filter((a) => a.status === 'approved').length
        const globalScore = totalControls > 0 ? Math.round((approvedControls / totalControls) * 100) : 0

        results.push({
          clientId,
          clientName: client?.nom ?? 'Entit\u00e9 inconnue',
          sector: client?.secteur ?? '',
          missionId: mission.id,
          missionName: mission.name,
          lastAuditDate: mission.end_date,
          globalScore,
          domainScores,
          totalControls,
          approvedControls,
          majorNcCount: carsByMission.get(mission.id) ?? 0,
          cabinetName: mode === 'group' ? (cabinetNameMap.get(mission.cabinet_id) ?? null) : null,
        })
      }

      // Sort by score descending
      results.sort((a, b) => b.globalScore - a.globalScore)
      setEntities(results)
    } catch (err) {
      console.error('useSupervisionData:', err)
      setError('Erreur lors du chargement des donn\u00e9es de supervision.')
    } finally {
      setLoading(false)
    }
  }, [profile?.organization_id, frameworkId, mode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { frameworks, entities, domains, loading, error }
}
