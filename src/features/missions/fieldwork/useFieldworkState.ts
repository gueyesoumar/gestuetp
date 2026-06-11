import { useState, useCallback } from 'react'
import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction'
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
  saveAssessment: (id: string, data: { evidence_notes: string; observations: string; conformity_level: string | null }, opts?: { silent?: boolean }) => Promise<boolean>
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

  const saveAssessment = useCallback(async (id: string, data: { evidence_notes: string; observations: string; conformity_level: string | null }, opts?: { silent?: boolean }): Promise<boolean> => {
    const silent = opts?.silent === true
    if (!silent) {
      setSaving(true)
      setSaveError(null)
    }
    // Cast needed: Supabase generated types resolve to `never` for update on this table
    const { error } = await (supabase
      .from('control_assessments') as unknown as { update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> } })
      .update({
        evidence_notes: data.evidence_notes || null,
        observations: data.observations || null,
        conformity_level: data.conformity_level || null,
      })
      .eq('id', id)
    if (error) {
      console.error('save assessment:', error.message)
      if (!silent) {
        setSaveError('Erreur lors de l\u2019enregistrement.')
        setSaving(false)
      }
      return false
    }
    if (!silent) {
      setSaving(false)
      refetch()
    }
    return true
  }, [refetch])

  const submitAssessment = useCallback(async (id: string, conformity_override_reason?: string | null): Promise<boolean> => {
    setSaving(true)
    setSaveError(null)
    const res = await invokeEdgeFunction('submit-assessment', {
      assessment_id: id,
      conformity_override_reason: conformity_override_reason ?? null,
    })
    if (!res.ok) {
      setSaveError(res.error ?? 'Erreur lors de la soumission.')
      setSaving(false)
      return false
    }
    setSaving(false)
    refetch()
    advanceToNext()
    return true
  }, [refetch, advanceToNext])

  // Validation routee via l'Edge Function review-assessment : c'est le serveur
  // qui determine le stage (lead/associate) et le newStatus selon le role du
  // reviewer et le statut courant — le client ne decide plus rien. Le parametre
  // `stage` est conserve pour compat de signature mais ignore (decide serveur).
  const approveAssessment = useCallback(async (id: string, comment: string, _stage?: string): Promise<boolean> => {
    setSaving(true)
    setSaveError(null)
    const res = await invokeEdgeFunction('review-assessment', {
      assessment_id: id,
      decision: 'approved',
      comment: comment || null,
    })
    if (!res.ok) {
      setSaveError(res.error ?? 'Erreur lors de la validation.')
      setSaving(false)
      return false
    }
    setSaving(false)
    refetch()
    return true
  }, [refetch])

  const rejectAssessment = useCallback(async (id: string, comment: string, _stage?: string): Promise<boolean> => {
    setSaving(true)
    setSaveError(null)
    const res = await invokeEdgeFunction('review-assessment', {
      assessment_id: id,
      decision: 'rejected',
      comment: comment || null,
    })
    if (!res.ok) {
      setSaveError(res.error ?? 'Erreur lors du rejet.')
      setSaving(false)
      return false
    }
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
