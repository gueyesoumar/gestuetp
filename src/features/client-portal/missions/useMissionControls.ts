import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { AssessmentObservation, FindingClassification } from '../../../types/database.types'

export interface ControlWithAssessment {
  controlId: string
  controlCode: string
  controlName: string
  controlDescription: string | null
  controlGuidance: string | null
  domainId: string
  domainCode: string
  domainName: string
  domainSortOrder: number
  assessmentId: string | null
  findings: string | null
  recommendations: string | null
  riskNotes: string | null
  conformityLevel: string | null
  classification: FindingClassification | null
  observationCount: number
  myObservationId: string | null
  hasResponse: boolean
}

export interface DomainSummary {
  domainId: string
  code: string
  name: string
  sortOrder: number
  total: number
  conformes: number
  observations: number
  minorNc: number
  majorNc: number
  strengths: number
  score: number
}

interface UseMissionControlsReturn {
  controls: ControlWithAssessment[]
  domainSummaries: DomainSummary[]
  totalControls: number
  globalScore: number
  conformesCount: number
  observationsCount: number
  minorNcCount: number
  majorNcCount: number
  strengthsCount: number
  myObservationsCount: number
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Loads all controls of the mission's framework with their assessment data
 * and observation state. Used by the client-side results tab.
 */
export function useMissionControls(missionId: string | undefined): UseMissionControlsReturn {
  const [controls, setControls] = useState<ControlWithAssessment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    const fetchData = async (): Promise<void> => {
      // 1. Get framework_id from mission
      const { data: mission, error: mErr } = await supabase
        .from('missions')
        .select('framework_id')
        .eq('id', missionId)
        .single()
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return
      if (mErr || !mission) { setError('Mission introuvable.'); setLoading(false); return }

      // 2. Get all domains for the framework
      const { data: domains } = await supabase
        .from('domains')
        .select('id, code, name, sort_order')
        .eq('framework_id', mission.framework_id)
        .order('sort_order')
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return
      if (!domains || domains.length === 0) { setControls([]); setLoading(false); return }

      // 3. Get all controls for these domains
      const { data: allControls } = await supabase
        .from('controls')
        .select('id, code, name, description, guidance, domain_id, sort_order')
        .in('domain_id', domains.map((d) => d.id))
        .order('sort_order')
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return
      if (!allControls || allControls.length === 0) { setControls([]); setLoading(false); return }

      // 4. Get assessments for this mission
      const { data: assessments } = await supabase
        .from('control_assessments')
        .select('id, control_id, findings, recommendations, risk_notes, conformity_level, finding_classification, status')
        .eq('mission_id', missionId)
        .in('status', ['submitted', 'in_review', 'approved'])
        .abortSignal(controller.signal)

      if (controller.signal.aborted) return

      const assessmentMap = new Map<string, typeof assessments[0]>()
      for (const a of assessments ?? []) {
        assessmentMap.set(a.control_id, a)
      }

      // 5. Get observations for these assessments
      const assessmentIds = (assessments ?? []).map((a) => a.id)
      let observationsByAssessment = new Map<string, AssessmentObservation[]>()
      let myUserId: string | null = null

      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', userData.user.id)
          .single()
        myUserId = profile?.id ?? null
      }

      if (assessmentIds.length > 0) {
        const { data: observations } = await supabase
          .from('assessment_observations')
          .select('*')
          .in('assessment_id', assessmentIds)
          .abortSignal(controller.signal)

        if (controller.signal.aborted) return
        for (const obs of (observations ?? []) as AssessmentObservation[]) {
          const list = observationsByAssessment.get(obs.assessment_id) ?? []
          list.push(obs)
          observationsByAssessment.set(obs.assessment_id, list)
        }
      }

      // 6. Build merged list
      const domainMap = new Map(domains.map((d) => [d.id, d]))
      const result: ControlWithAssessment[] = allControls.map((ctrl) => {
        const domain = domainMap.get(ctrl.domain_id)!
        const assessment = assessmentMap.get(ctrl.id)
        const obsList = assessment ? observationsByAssessment.get(assessment.id) ?? [] : []
        const myObs = myUserId ? obsList.find((o) => o.observation_by === myUserId) : null
        const hasResponse = obsList.some((o) => o.response_text !== null)

        return {
          controlId: ctrl.id,
          controlCode: ctrl.code,
          controlName: ctrl.name,
          controlDescription: ctrl.description,
          controlGuidance: ctrl.guidance,
          domainId: domain.id,
          domainCode: domain.code,
          domainName: domain.name,
          domainSortOrder: domain.sort_order,
          assessmentId: assessment?.id ?? null,
          findings: assessment?.findings ?? null,
          recommendations: assessment?.recommendations ?? null,
          riskNotes: assessment?.risk_notes ?? null,
          conformityLevel: assessment?.conformity_level ?? null,
          classification: (assessment?.finding_classification ?? null) as FindingClassification | null,
          observationCount: obsList.length,
          myObservationId: myObs?.id ?? null,
          hasResponse,
        }
      })

      setControls(result)
      setLoading(false)
    }

    fetchData()
    return () => controller.abort()
  }, [missionId, refreshKey])

  // Compute domain summaries + global stats
  const domainMap = new Map<string, DomainSummary>()
  for (const c of controls) {
    const existing = domainMap.get(c.domainId) ?? {
      domainId: c.domainId, code: c.domainCode, name: c.domainName,
      sortOrder: c.domainSortOrder,
      total: 0, conformes: 0, observations: 0, minorNc: 0, majorNc: 0, strengths: 0, score: 0,
    }
    existing.total++
    if (c.assessmentId) {
      if (c.classification === 'major_nc') existing.majorNc++
      else if (c.classification === 'minor_nc') existing.minorNc++
      else if (c.classification === 'observation') existing.observations++
      else if (c.classification === 'strength') existing.strengths++
      else existing.conformes++
    }
    domainMap.set(c.domainId, existing)
  }

  const domainSummaries: DomainSummary[] = [...domainMap.values()]
    .map((d) => ({
      ...d,
      score: d.total > 0 ? Math.round((d.conformes / d.total) * 100) : 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const totalControls = controls.length
  const conformesCount = controls.filter((c) => c.assessmentId && !c.classification).length
  const observationsCount = controls.filter((c) => c.classification === 'observation').length
  const minorNcCount = controls.filter((c) => c.classification === 'minor_nc').length
  const majorNcCount = controls.filter((c) => c.classification === 'major_nc').length
  const strengthsCount = controls.filter((c) => c.classification === 'strength').length
  const myObservationsCount = controls.filter((c) => c.myObservationId).length
  const globalScore = totalControls > 0 ? Math.round((conformesCount / totalControls) * 100) : 0

  return {
    controls, domainSummaries, totalControls, globalScore,
    conformesCount, observationsCount, minorNcCount, majorNcCount, strengthsCount,
    myObservationsCount,
    loading, error, refetch,
  }
}
