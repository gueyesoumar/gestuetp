import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'

export interface ClientFinding {
  id: string
  controlCode: string
  controlName: string
  findings: string
  recommendations: string
  riskNotes: string | null
  conformityLevel: string | null
  status: string
  clientValidation: 'pending' | 'approved' | 'contested'
  clientComment: string | null
}

interface UseClientFindingsReturn {
  findings: ClientFinding[]
  pendingCount: number
  approvedCount: number
  contestedCount: number
  loading: boolean
  submitValidation: (assessmentId: string, decision: 'approved' | 'contested', comment: string) => Promise<boolean>
  submitting: boolean
}

export function useClientFindings(missionId: string): UseClientFindingsReturn {
  const [findings, setFindings] = useState<ClientFinding[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async (): Promise<void> => {
    setLoading(true)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setLoading(false); return }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }

    // Fetch assessments that are submitted/approved (visible to client)
    const res = await fetch(
      `${baseUrl}/rest/v1/control_assessments?mission_id=eq.${missionId}&status=in.(submitted,in_review,approved)&select=id,control_id,findings,recommendations,risk_notes,conformity_level,status`,
      { headers }
    )
    if (!res.ok) { setLoading(false); return }
    const assessments = await res.json() as Record<string, unknown>[]

    if (assessments.length === 0) { setFindings([]); setLoading(false); return }

    // Fetch control codes
    const controlIds = [...new Set(assessments.map((a) => a.control_id as string))]
    let controlMap: Record<string, { code: string; name: string }> = {}
    if (controlIds.length > 0) {
      const ctrlRes = await fetch(
        `${baseUrl}/rest/v1/controls?id=in.(${controlIds.join(',')})&select=id,code,name`,
        { headers }
      )
      if (ctrlRes.ok) {
        const controls = await ctrlRes.json() as { id: string; code: string; name: string }[]
        controlMap = Object.fromEntries(controls.map((c) => [c.id, { code: c.code, name: c.name }]))
      }
    }

    // Fetch existing client validations
    const assessmentIds = assessments.map((a) => a.id as string)
    const valRes = await fetch(
      `${baseUrl}/rest/v1/assessment_validations?assessment_id=in.(${assessmentIds.join(',')})&stage=eq.client_review&select=assessment_id,decision,comment`,
      { headers }
    )
    const validations = valRes.ok
      ? await valRes.json() as { assessment_id: string; decision: string; comment: string | null }[]
      : []
    const valMap = Object.fromEntries(validations.map((v) => [v.assessment_id, v]))

    const mapped: ClientFinding[] = assessments.map((a) => {
      const ctrl = controlMap[a.control_id as string]
      const val = valMap[a.id as string]
      return {
        id: a.id as string,
        controlCode: ctrl?.code ?? '',
        controlName: ctrl?.name ?? '',
        findings: (a.findings as string) ?? '',
        recommendations: (a.recommendations as string) ?? '',
        riskNotes: (a.risk_notes as string) ?? null,
        conformityLevel: (a.conformity_level as string) ?? null,
        status: a.status as string,
        clientValidation: val ? (val.decision as 'approved' | 'contested') : 'pending',
        clientComment: val?.comment ?? null,
      }
    })

    mapped.sort((a, b) => {
      const order = { pending: 0, contested: 1, approved: 2 }
      return (order[a.clientValidation] ?? 0) - (order[b.clientValidation] ?? 0)
    })

    setFindings(mapped)
    setLoading(false)
  }, [missionId])

  useEffect(() => { fetchData() }, [fetchData])

  const submitValidation = useCallback(async (assessmentId: string, decision: 'approved' | 'contested', comment: string): Promise<boolean> => {
    setSubmitting(true)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setSubmitting(false); return false }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const res = await fetch(`${baseUrl}/rest/v1/assessment_validations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        assessment_id: assessmentId,
        stage: 'client_review',
        decision,
        comment: comment || null,
        validated_by: (await supabase.from('users').select('id').eq('auth_id', (await supabase.auth.getUser()).data.user?.id ?? '').single()).data?.id,
      }),
    })

    setSubmitting(false)
    if (res.ok) { fetchData(); return true }
    return false
  }, [fetchData])

  const pendingCount = findings.filter((f) => f.clientValidation === 'pending').length
  const approvedCount = findings.filter((f) => f.clientValidation === 'approved').length
  const contestedCount = findings.filter((f) => f.clientValidation === 'contested').length

  return { findings, pendingCount, approvedCount, contestedCount, loading, submitValidation, submitting }
}
