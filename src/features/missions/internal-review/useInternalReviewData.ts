import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

export interface DomainScore {
  code: string
  name: string
  total: number
  approved: number
  score: number
}

export interface FindingSummary {
  conformes: number
  observations: number
  ncMinor: number
  ncMajor: number
  strengths: number
}

export interface MajorNC {
  controlCode: string
  controlName: string
  findings: string
}

export type FindingClassification = 'major_nc' | 'minor_nc' | 'observation' | 'strength'

export interface ValidationEvent {
  stage: 'auditor_submitted' | 'lead_review' | 'associate_review' | 'client_review'
  decision: 'approved' | 'rejected'
  comment: string | null
  authorName: string
  createdAt: string
}

export interface AssessmentDetail {
  assessmentId: string
  controlId: string
  controlCode: string
  controlName: string
  domainCode: string
  status: string
  conformityLevel: string | null
  observations: string | null
  evidenceNotes: string | null
  findingsCount: number
  topClassification: FindingClassification | null
  hasMissingPriority: boolean
  hasMissingRecommendation: boolean
  validations: ValidationEvent[]
}

export interface InternalReviewData {
  totalControls: number
  approvedControls: number
  withFindings: number
  withEvidence: number
  domainScores: DomainScore[]
  findingSummary: FindingSummary
  majorNCs: MajorNC[]
  globalScore: number
  assessmentDetails: AssessmentDetail[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useInternalReviewData(missionId: string, frameworkId: string): InternalReviewData {
  const [data, setData] = useState<Omit<InternalReviewData, 'loading' | 'error' | 'refetch'>>({
    totalControls: 0, approvedControls: 0, withFindings: 0, withEvidence: 0,
    domainScores: [], findingSummary: { conformes: 0, observations: 0, ncMinor: 0, ncMajor: 0, strengths: 0 },
    majorNCs: [], globalScore: 0, assessmentDetails: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) { setLoading(false); return }
    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    const fetchData = async (): Promise<void> => {

      // 1. Fetch all assessments with control + domain info + raw fields needed for quality checks
      type AssessmentRow = {
        id: string
        status: string
        conformity_level: string | null
        observations: string | null
        evidence_notes: string | null
        control_id: string
        control: { code: string; name: string; domain_id: string; domain: { code: string; name: string } } | null
      }
      const { data: assessments, error: aErr } = await supabase
        .from('control_assessments')
        .select('id, status, conformity_level, observations, evidence_notes, control_id, control:controls(code, name, domain_id, domain:domains(code, name))')
        .eq('mission_id', missionId)
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return
      if (aErr) { setError('Impossible de charger les donn\u00e9es de revue.'); setLoading(false); return }

      const all = (assessments ?? []) as unknown as AssessmentRow[]
      const totalControls = all.length
      const approvedControls = all.filter((a) => a.status === 'approved').length

      // 1b. Fetch findings from assessment_findings (with priority + recommendation for quality checks)
      const assessmentIds = all.map((a) => a.id)
      const findingsByAssessment = new Map<string, Array<{ classification: FindingClassification; description: string; priority: string | null; recommendation: string | null }>>()
      if (assessmentIds.length > 0) {
        const { data: findingsRows } = await supabase
          .from('assessment_findings')
          .select('assessment_id, classification, description, priority, recommendation')
          .in('assessment_id', assessmentIds)
          .abortSignal(abortController.signal)
        if (abortController.signal.aborted) return
        for (const f of (findingsRows ?? []) as Array<{ assessment_id: string; classification: FindingClassification; description: string; priority: string | null; recommendation: string | null }>) {
          const list = findingsByAssessment.get(f.assessment_id) ?? []
          list.push({ classification: f.classification, description: f.description, priority: f.priority, recommendation: f.recommendation })
          findingsByAssessment.set(f.assessment_id, list)
        }
      }

      // 1c. Fetch validations per assessment (with author user info)
      const validationsByAssessment = new Map<string, ValidationEvent[]>()
      if (assessmentIds.length > 0) {
        const { data: validationRows } = await supabase
          .from('assessment_validations')
          .select('assessment_id, stage, decision, comment, created_at, validated_by, user:users!assessment_validations_validated_by_fkey(first_name, last_name)')
          .in('assessment_id', assessmentIds)
          .order('created_at', { ascending: true })
          .abortSignal(abortController.signal)
        if (abortController.signal.aborted) return
        for (const v of (validationRows ?? []) as Array<{ assessment_id: string; stage: ValidationEvent['stage']; decision: ValidationEvent['decision']; comment: string | null; created_at: string; user: { first_name: string; last_name: string } | null }>) {
          const list = validationsByAssessment.get(v.assessment_id) ?? []
          list.push({
            stage: v.stage,
            decision: v.decision,
            comment: v.comment,
            authorName: v.user ? `${v.user.first_name} ${v.user.last_name}` : 'Utilisateur',
            createdAt: v.created_at,
          })
          validationsByAssessment.set(v.assessment_id, list)
        }
      }

      // Compute most severe classification per assessment (transitional logic)
      const SEVERITY: Record<FindingClassification, number> = { major_nc: 4, minor_nc: 3, observation: 2, strength: 1 }
      const topClassByAssessment = new Map<string, FindingClassification | null>()
      for (const a of all) {
        const fs = findingsByAssessment.get(a.id) ?? []
        if (fs.length === 0) {
          topClassByAssessment.set(a.id, null)
          continue
        }
        const top = fs.reduce<FindingClassification>((acc, f) => (
          SEVERITY[f.classification] > SEVERITY[acc] ? f.classification : acc
        ), fs[0].classification)
        topClassByAssessment.set(a.id, top)
      }

      const withFindings = all.filter((a) => (findingsByAssessment.get(a.id) ?? []).length > 0).length

      // Pond\u00e9ration conformit\u00e9 : c=100, lc=75, pc=50, nc=0, NA exclus
      const weightOf = (level: string | null | undefined): number | null => {
        switch (level) {
          case 'c':  return 100
          case 'lc': return 75
          case 'pc': return 50
          case 'nc': return 0
          default:   return null
        }
      }

      // 2. Count documents as evidence
      const { count: evidenceCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('mission_id', missionId)
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return

      // 3. Domain scores : pondération conformity_level (vrai score d'audit)
      //    `approved` reste le compteur de contrôles validés workflow, mais
      //    le `score` reflète maintenant la conformité réelle.
      const domainMap = new Map<string, { code: string; name: string; total: number; approved: number; sum: number; count: number }>()
      for (const a of all) {
        const ctrl = a.control as unknown as { code: string; name: string; domain: { code: string; name: string } | null } | null
        if (!ctrl?.domain) continue
        const key = ctrl.domain.code
        if (!domainMap.has(key)) {
          domainMap.set(key, { code: ctrl.domain.code, name: ctrl.domain.name, total: 0, approved: 0, sum: 0, count: 0 })
        }
        const d = domainMap.get(key)!
        d.total++
        if (a.status === 'approved') d.approved++
        const w = weightOf(a.conformity_level as string | null | undefined)
        if (w !== null) { d.sum += w; d.count += 1 }
      }
      const domainScores: DomainScore[] = [...domainMap.values()]
        .map((d) => ({
          code: d.code, name: d.name, total: d.total, approved: d.approved,
          score: d.count > 0 ? Math.round(d.sum / d.count) : 0,
        }))
        .sort((a, b) => a.code.localeCompare(b.code))

      // 4. Finding classification summary (based on most severe finding per assessment)
      const summary: FindingSummary = { conformes: 0, observations: 0, ncMinor: 0, ncMajor: 0, strengths: 0 }
      for (const a of all) {
        const top = topClassByAssessment.get(a.id) ?? null
        switch (top) {
          case 'major_nc': summary.ncMajor++; break
          case 'minor_nc': summary.ncMinor++; break
          case 'observation': summary.observations++; break
          case 'strength': summary.strengths++; break
          default: if (a.status === 'approved') summary.conformes++; break
        }
      }

      // 5. Major NCs list (one entry per major_nc finding)
      const majorNCs: MajorNC[] = []
      for (const a of all) {
        const ctrl = a.control as unknown as { code: string; name: string } | null
        const fs = findingsByAssessment.get(a.id) ?? []
        for (const f of fs) {
          if (f.classification === 'major_nc') {
            majorNCs.push({
              controlCode: ctrl?.code ?? '',
              controlName: ctrl?.name ?? '',
              findings: f.description,
            })
          }
        }
      }

      // Score global : pondération c=100/lc=75/pc=50/nc=0, NA exclus
      let scoreSum = 0
      let scoreCount = 0
      for (const a of all) {
        const w = weightOf(a.conformity_level as string | null | undefined)
        if (w !== null) { scoreSum += w; scoreCount += 1 }
      }
      const globalScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0

      // 6. Build per-assessment detail records (for timeline + quality callout)
      const assessmentDetails: AssessmentDetail[] = []
      for (const a of all) {
        const ctrl = a.control as unknown as { code: string; name: string; domain: { code: string; name: string } | null } | null
        const fs = findingsByAssessment.get(a.id) ?? []
        const top = topClassByAssessment.get(a.id) ?? null
        const hasMissingPriority = fs.some((f) => (f.classification === 'major_nc' || f.classification === 'minor_nc') && !f.priority)
        const hasMissingRecommendation = fs.some((f) => (f.classification === 'major_nc' || f.classification === 'minor_nc') && (!f.recommendation || f.recommendation.trim().length === 0))
        assessmentDetails.push({
          assessmentId: a.id,
          controlId: a.control_id ?? '',
          controlCode: ctrl?.code ?? '',
          controlName: ctrl?.name ?? '',
          domainCode: ctrl?.domain?.code ?? '',
          status: a.status as string,
          conformityLevel: (a.conformity_level as string | null) ?? null,
          observations: (a as { observations?: string | null }).observations ?? null,
          evidenceNotes: (a as { evidence_notes?: string | null }).evidence_notes ?? null,
          findingsCount: fs.length,
          topClassification: top,
          hasMissingPriority,
          hasMissingRecommendation,
          validations: validationsByAssessment.get(a.id) ?? [],
        })
      }
      assessmentDetails.sort((x, y) => x.controlCode.localeCompare(y.controlCode))

      setData({
        totalControls, approvedControls, withFindings,
        withEvidence: evidenceCount ?? 0,
        domainScores, findingSummary: summary, majorNCs, globalScore,
        assessmentDetails,
      })
      setLoading(false)
    }

    fetchData()
    return () => abortController.abort()
  }, [missionId, frameworkId, refreshKey])

  return { ...data, loading, error, refetch }
}
