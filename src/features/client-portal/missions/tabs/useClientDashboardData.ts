import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { ClientMissionDetail } from '../useClientMissionDetail'

export interface ClientDashboardData {
  /** Mission progress */
  currentPhaseIndex: number
  totalPhases: number
  overallPercent: number
  daysRemaining: number | null
  /** Documents */
  docsExpected: number
  docsUploaded: number
  docsPending: number
  /** Findings / validations */
  findingsPendingValidation: number
  /** Interviews */
  upcomingInterviewCount: number
  /** CARs */
  carsPendingCount: number
  /** Computed total pending actions */
  totalPendingActions: number
  loading: boolean
}

const PHASE_ORDER = ['initialization', 'scoping', 'planning', 'fieldwork', 'internal_review', 'client_review', 'closure']

export function useClientDashboardData(mission: ClientMissionDetail): ClientDashboardData {
  const [data, setData] = useState<Omit<ClientDashboardData, 'loading'>>({
    currentPhaseIndex: 0, totalPhases: 6, overallPercent: 0,
    daysRemaining: null,
    docsExpected: 0, docsUploaded: 0, docsPending: 0,
    findingsPendingValidation: 0,
    upcomingInterviewCount: 0, carsPendingCount: 0,
    totalPendingActions: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async (): Promise<void> => {
    setLoading(true)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setLoading(false); return }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }

    // Phase progress
    const statusIdx = PHASE_ORDER.indexOf(mission.status)
    const currentPhaseIndex = statusIdx >= 0 ? statusIdx : 0
    const overallPercent = Math.round(((currentPhaseIndex) / 6) * 100)

    // Days remaining
    let daysRemaining: number | null = null
    if (mission.end_date) {
      const diff = new Date(mission.end_date).getTime() - Date.now()
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }

    // Parallel fetches
    const [docsResult, findingsResult, interviewsResult, carsResult] = await Promise.all([
      fetchDocsCounts(mission.id, headers, baseUrl),
      fetchPendingFindings(mission.id, headers, baseUrl),
      fetchUpcomingInterviews(mission.id, headers, baseUrl),
      fetchPendingCARs(mission.id, headers, baseUrl),
    ])

    const totalPendingActions = docsResult.pending + findingsResult + interviewsResult + carsResult

    setData({
      currentPhaseIndex, totalPhases: 6, overallPercent, daysRemaining,
      docsExpected: docsResult.expected, docsUploaded: docsResult.uploaded, docsPending: docsResult.pending,
      findingsPendingValidation: findingsResult,
      upcomingInterviewCount: interviewsResult,
      carsPendingCount: carsResult,
      totalPendingActions,
    })
    setLoading(false)
  }, [mission.id, mission.status, mission.end_date])

  useEffect(() => { fetchAll() }, [fetchAll])

  return { ...data, loading }
}

type Headers = Record<string, string>

async function fetchDocsCounts(missionId: string, headers: Headers, baseUrl: string): Promise<{ expected: number; uploaded: number; pending: number }> {
  // 1. Count only documents explicitly requested by auditor
  const reqRes = await fetch(
    `${baseUrl}/rest/v1/mission_evidence_requests?mission_id=eq.${missionId}&select=evidence_catalog_id`,
    { headers }
  )
  if (!reqRes.ok) return { expected: 0, uploaded: 0, pending: 0 }
  const requestRows = await reqRes.json() as { evidence_catalog_id: string }[]
  if (requestRows.length === 0) return { expected: 0, uploaded: 0, pending: 0 }

  // 2. Get the names of requested catalog items (for matching with uploaded docs)
  const catalogIds = requestRows.map((r) => r.evidence_catalog_id)
  const catRes = await fetch(
    `${baseUrl}/rest/v1/evidence_catalog?id=in.(${catalogIds.join(',')})&select=name`,
    { headers }
  )
  const requestedNames = new Set<string>()
  if (catRes.ok) {
    const items = await catRes.json() as { name: string }[]
    for (const item of items) requestedNames.add(item.name)
  }

  // 3. Count uploaded documents matching requested evidence
  const docsRes = await fetch(
    `${baseUrl}/rest/v1/documents?mission_id=eq.${missionId}&select=description`,
    { headers }
  )
  const uploadedNames = new Set<string>()
  if (docsRes.ok) {
    const docs = await docsRes.json() as { description: string | null }[]
    for (const d of docs) {
      const match = d.description?.match(/\[EVIDENCE:(.+?)\]/)
      if (match && requestedNames.has(match[1])) uploadedNames.add(match[1])
    }
  }

  const expected = requestedNames.size
  const uploaded = uploadedNames.size
  return { expected, uploaded, pending: Math.max(0, expected - uploaded) }
}

async function fetchPendingFindings(missionId: string, headers: Headers, baseUrl: string): Promise<number> {
  // Count assessments in client_review stage without client validation
  const res = await fetch(
    `${baseUrl}/rest/v1/control_assessments?mission_id=eq.${missionId}&status=in.(submitted,in_review,approved)&select=id`,
    { headers }
  )
  if (!res.ok) return 0
  const assessments = await res.json() as { id: string }[]
  if (!assessments.length) return 0

  const ids = assessments.map((a) => a.id)
  const valRes = await fetch(
    `${baseUrl}/rest/v1/assessment_validations?assessment_id=in.(${ids.join(',')})&stage=eq.client_review&select=assessment_id`,
    { headers }
  )
  const validated = valRes.ok ? (await valRes.json() as { assessment_id: string }[]).map((v) => v.assessment_id) : []
  const validatedSet = new Set(validated)

  return assessments.filter((a) => !validatedSet.has(a.id)).length
}

async function fetchUpcomingInterviews(missionId: string, headers: Headers, baseUrl: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const res = await fetch(
    `${baseUrl}/rest/v1/interview_schedules?mission_id=eq.${missionId}&status=in.(scheduled,confirmed)&scheduled_date=gte.${today}&select=id`,
    { headers }
  )
  if (!res.ok) return 0
  const interviews = await res.json() as { id: string }[]
  return interviews.length
}

async function fetchPendingCARs(missionId: string, headers: Headers, baseUrl: string): Promise<number> {
  const res = await fetch(
    `${baseUrl}/rest/v1/corrective_action_requests?mission_id=eq.${missionId}&status=eq.sent_to_client&select=id`,
    { headers }
  )
  if (!res.ok) return 0
  const cars = await res.json() as { id: string }[]
  return cars.length
}
