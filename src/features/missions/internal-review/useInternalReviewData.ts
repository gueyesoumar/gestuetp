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

export interface InternalReviewData {
  totalControls: number
  approvedControls: number
  withFindings: number
  withEvidence: number
  domainScores: DomainScore[]
  findingSummary: FindingSummary
  majorNCs: MajorNC[]
  globalScore: number
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useInternalReviewData(missionId: string, frameworkId: string): InternalReviewData {
  const [data, setData] = useState<Omit<InternalReviewData, 'loading' | 'error' | 'refetch'>>({
    totalControls: 0, approvedControls: 0, withFindings: 0, withEvidence: 0,
    domainScores: [], findingSummary: { conformes: 0, observations: 0, ncMinor: 0, ncMajor: 0, strengths: 0 },
    majorNCs: [], globalScore: 0,
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
      // 1. Fetch all assessments with control + domain info
      const { data: assessments, error: aErr } = await supabase
        .from('control_assessments')
        .select('id, status, findings, finding_classification, control_id, control:controls(code, name, domain_id, domain:domains(code, name))')
        .eq('mission_id', missionId)
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return
      if (aErr) { setError('Impossible de charger les donn\u00e9es de revue.'); setLoading(false); return }

      const all = assessments ?? []
      const totalControls = all.length
      const approvedControls = all.filter((a) => a.status === 'approved').length
      const withFindings = all.filter((a) => a.findings && a.findings.trim().length > 0).length

      // 2. Count documents as evidence
      const { count: evidenceCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('mission_id', missionId)
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return

      // 3. Domain scores
      const domainMap = new Map<string, { code: string; name: string; total: number; approved: number }>()
      for (const a of all) {
        const ctrl = a.control as unknown as { code: string; name: string; domain: { code: string; name: string } | null } | null
        if (!ctrl?.domain) continue
        const key = ctrl.domain.code
        if (!domainMap.has(key)) {
          domainMap.set(key, { code: ctrl.domain.code, name: ctrl.domain.name, total: 0, approved: 0 })
        }
        const d = domainMap.get(key)!
        d.total++
        if (a.status === 'approved') d.approved++
      }
      const domainScores: DomainScore[] = [...domainMap.values()]
        .map((d) => ({ ...d, score: d.total > 0 ? Math.round((d.approved / d.total) * 100) : 0 }))
        .sort((a, b) => a.code.localeCompare(b.code))

      // 4. Finding classification summary
      const summary: FindingSummary = { conformes: 0, observations: 0, ncMinor: 0, ncMajor: 0, strengths: 0 }
      for (const a of all) {
        switch (a.finding_classification) {
          case 'major_nc': summary.ncMajor++; break
          case 'minor_nc': summary.ncMinor++; break
          case 'observation': summary.observations++; break
          case 'strength': summary.strengths++; break
          default: if (a.status === 'approved') summary.conformes++; break
        }
      }

      // 5. Major NCs list
      const majorNCs: MajorNC[] = all
        .filter((a) => a.finding_classification === 'major_nc')
        .map((a) => {
          const ctrl = a.control as unknown as { code: string; name: string } | null
          return {
            controlCode: ctrl?.code ?? '',
            controlName: ctrl?.name ?? '',
            findings: a.findings ?? '',
          }
        })

      const globalScore = totalControls > 0 ? Math.round((approvedControls / totalControls) * 100) : 0

      setData({
        totalControls, approvedControls, withFindings,
        withEvidence: evidenceCount ?? 0,
        domainScores, findingSummary: summary, majorNCs, globalScore,
      })
      setLoading(false)
    }

    fetchData()
    return () => abortController.abort()
  }, [missionId, frameworkId, refreshKey])

  return { ...data, loading, error, refetch }
}
