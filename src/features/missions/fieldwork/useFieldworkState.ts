import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { AssessmentWithControl } from '../useAuditorAssessments'

type WorkMode = 'guided' | 'libre'

interface FieldworkState {
  selectedId: string | null
  mode: WorkMode
  guidedStep: number
  autoAdvance: boolean
  saving: boolean
  saveError: string | null
  selectControl: (id: string) => void
  setMode: (mode: WorkMode) => void
  setGuidedStep: (step: number) => void
  toggleAutoAdvance: () => void
  saveAssessment: (id: string, data: { findings: string; recommendations: string; evidence_notes: string; observations: string; risk_notes: string; conformity_level: string | null }) => Promise<boolean>
  submitAssessment: (id: string) => Promise<boolean>
  approveAssessment: (id: string, comment: string, stage?: string) => Promise<boolean>
  rejectAssessment: (id: string, comment: string, stage?: string) => Promise<boolean>
}

const MODE_KEY = 'gestu:fieldwork-mode'
const AUTO_KEY = 'gestu:fieldwork-auto-advance'

function readStorage<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

export function useFieldworkState(
  assessments: AssessmentWithControl[],
  refetch: () => void
): FieldworkState {
  const [selectedId, setSelectedId] = useState<string | null>(
    () => assessments.find((a) => a.status === 'draft')?.control_id ?? assessments[0]?.control_id ?? null
  )
  const [mode, setModeState] = useState<WorkMode>(() => readStorage(MODE_KEY, 'guided'))
  const [guidedStep, setGuidedStep] = useState(0)
  const [autoAdvance, setAutoAdvance] = useState(() => readStorage(AUTO_KEY, true))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const setMode = useCallback((m: WorkMode) => {
    setModeState(m)
    localStorage.setItem(MODE_KEY, JSON.stringify(m))
  }, [])

  const toggleAutoAdvance = useCallback(() => {
    setAutoAdvance((prev) => {
      const next = !prev
      localStorage.setItem(AUTO_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const selectControl = useCallback((id: string) => {
    setSelectedId(id)
    setGuidedStep(0)
    setSaveError(null)
  }, [])

  const advanceToNext = useCallback(() => {
    if (!autoAdvance) return
    const draftIds = assessments.filter((a) => a.status === 'draft').map((a) => a.control_id)
    const currentIdx = draftIds.indexOf(selectedId ?? '')
    const nextId = draftIds[currentIdx + 1] ?? draftIds[0]
    if (nextId && nextId !== selectedId) {
      setSelectedId(nextId)
      setGuidedStep(0) // Reset to Observer step for the new control
    }
  }, [autoAdvance, assessments, selectedId])

  const saveAssessment = useCallback(async (id: string, data: { findings: string; recommendations: string; evidence_notes: string; observations: string; risk_notes: string; conformity_level: string | null }): Promise<boolean> => {
    setSaving(true)
    setSaveError(null)
    // Cast needed: Supabase generated types resolve to `never` for update on this table
    const { error } = await (supabase
      .from('control_assessments') as unknown as { update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> } })
      .update({
        findings: data.findings || null,
        recommendations: data.recommendations || null,
        evidence_notes: data.evidence_notes || null,
        observations: data.observations || null,
        risk_notes: data.risk_notes || null,
        conformity_level: data.conformity_level || null,
      })
      .eq('id', id)
    if (error) {
      console.error('save assessment:', error.message)
      setSaveError('Erreur lors de l\u2019enregistrement.')
      setSaving(false)
      return false
    }
    setSaving(false)
    refetch()
    return true
  }, [refetch])

  const submitAssessment = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true)
    setSaveError(null)
    const { data, error: fnError } = await supabase.functions.invoke('submit-assessment', {
      body: { assessment_id: id },
    })
    if (fnError || data?.error) {
      setSaveError(fnError?.message ?? data?.error ?? 'Erreur lors de la soumission.')
      setSaving(false)
      return false
    }
    setSaving(false)
    refetch()
    advanceToNext()
    return true
  }, [refetch, advanceToNext])

  const approveAssessment = useCallback(async (id: string, comment: string, stage?: string): Promise<boolean> => {
    setSaving(true)
    setSaveError(null)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setSaving(false); return false }

    // Get current user id
    const { data: userData } = await supabase.from('users').select('id').eq('auth_id', (await supabase.auth.getUser()).data.user?.id ?? '').single()
    if (!userData) { setSaving(false); return false }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY

    // Create validation record
    await fetch(`${baseUrl}/rest/v1/assessment_validations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apikey, 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        assessment_id: id,
        stage: stage ?? 'lead_review',
        decision: 'approved',
        comment: comment || null,
        validated_by: userData.id,
      }),
    })

    // Only update status to approved if associate review (final step), or set to in_review for lead
    const newStatus = (stage ?? 'lead_review') === 'associate_review' ? 'approved' : 'in_review'
    await fetch(`${baseUrl}/rest/v1/control_assessments?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': apikey, 'Authorization': `Bearer ${token}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: newStatus }),
    })

    setSaving(false)
    refetch()
    return true
  }, [refetch])

  const rejectAssessment = useCallback(async (id: string, comment: string, stage?: string): Promise<boolean> => {
    setSaving(true)
    setSaveError(null)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setSaving(false); return false }

    const { data: userData } = await supabase.from('users').select('id').eq('auth_id', (await supabase.auth.getUser()).data.user?.id ?? '').single()
    if (!userData) { setSaving(false); return false }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY

    // Create validation record
    await fetch(`${baseUrl}/rest/v1/assessment_validations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apikey, 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        assessment_id: id,
        stage: stage ?? 'lead_review',
        decision: 'rejected',
        comment: comment || null,
        validated_by: userData.id,
      }),
    })

    // Update assessment status to rejected
    await fetch(`${baseUrl}/rest/v1/control_assessments?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': apikey, 'Authorization': `Bearer ${token}`, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: 'rejected' }),
    })

    setSaving(false)
    refetch()
    return true
  }, [refetch])

  return {
    selectedId, mode, guidedStep, autoAdvance, saving, saveError,
    selectControl, setMode, setGuidedStep, toggleAutoAdvance,
    saveAssessment, submitAssessment, approveAssessment, rejectAssessment,
  }
}
