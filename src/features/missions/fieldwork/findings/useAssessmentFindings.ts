import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import type {
  AssessmentFinding,
  AssessmentFindingUpdate,
  FindingClassification,
  FindingPriority,
} from '../../../../types/database.types'

export type { AssessmentFinding, FindingClassification, FindingPriority }

export type FindingPatch = AssessmentFindingUpdate

export interface NewFindingInput extends FindingPatch {
  ai_generated?: boolean
}

export interface UseAssessmentFindingsReturn {
  findings: AssessmentFinding[]
  loading: boolean
  error: string | null
  addFinding: (input?: NewFindingInput) => Promise<AssessmentFinding | null>
  updateFinding: (id: string, patch: FindingPatch) => Promise<boolean>
  deleteFinding: (id: string) => Promise<boolean>
  moveFinding: (id: string, direction: 'up' | 'down') => Promise<boolean>
  bulkInsertFromAi: (drafts: NewFindingInput[]) => Promise<number>
  refetch: () => Promise<void>
}

const TABLE = 'assessment_findings'

export function useAssessmentFindings(assessmentId: string | null): UseAssessmentFindingsReturn {
  const [findings, setFindings] = useState<AssessmentFinding[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async (): Promise<void> => {
    if (!assessmentId) {
      setFindings([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await supabase.from(TABLE)
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('ord', { ascending: true })
      .returns<AssessmentFinding[]>()
    if (result.error) {
      console.error('[useAssessmentFindings] fetch:', result.error.message)
      setError('Erreur de chargement des constats')
      setLoading(false)
      return
    }
    setFindings(result.data ?? [])
    setLoading(false)
  }, [assessmentId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const addFinding = useCallback(async (input?: NewFindingInput): Promise<AssessmentFinding | null> => {
    if (!assessmentId) return null
    const nextOrd = findings.length > 0 ? Math.max(...findings.map((f) => f.ord)) + 1 : 0
    const payload = {
      assessment_id: assessmentId,
      ord: nextOrd,
      classification: input?.classification ?? 'observation',
      description: input?.description ?? '',
      risk: input?.risk ?? null,
      recommendation: input?.recommendation ?? null,
      priority: input?.priority ?? null,
      proposed_deadline: input?.proposed_deadline ?? null,
      ai_generated: input?.ai_generated ?? false,
    }
    const result = await supabase.from(TABLE)
      .insert(payload)
      .select()
      .single<AssessmentFinding>()
    if (result.error || !result.data) {
      console.error('[useAssessmentFindings] add:', result.error?.message)
      setError("Erreur d'ajout du constat")
      return null
    }
    const newFinding = result.data
    setFindings((prev) => [...prev, newFinding].sort((a, b) => a.ord - b.ord))
    return newFinding
  }, [assessmentId, findings])

  const updateFinding = useCallback(async (id: string, patch: FindingPatch): Promise<boolean> => {
    setFindings((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    const result = await supabase.from(TABLE).update(patch as never).eq('id', id)
    if (result.error) {
      console.error('[useAssessmentFindings] update:', result.error.message)
      setError('Erreur de sauvegarde du constat')
      void refetch()
      return false
    }
    return true
  }, [refetch])

  const deleteFinding = useCallback(async (id: string): Promise<boolean> => {
    const previous = findings
    setFindings((prev) => prev.filter((f) => f.id !== id))
    const result = await supabase.from(TABLE).delete().eq('id', id)
    if (result.error) {
      console.error('[useAssessmentFindings] delete:', result.error.message)
      setError('Erreur de suppression du constat')
      setFindings(previous)
      return false
    }
    return true
  }, [findings])

  const moveFinding = useCallback(async (id: string, direction: 'up' | 'down'): Promise<boolean> => {
    const idx = findings.findIndex((f) => f.id === id)
    if (idx < 0) return false
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= findings.length) return false
    const a = findings[idx]
    const b = findings[targetIdx]
    setFindings((prev) => {
      const copy = [...prev]
      copy[idx] = { ...a, ord: b.ord }
      copy[targetIdx] = { ...b, ord: a.ord }
      return copy.sort((x, y) => x.ord - y.ord)
    })
    const r1 = await supabase.from(TABLE).update({ ord: b.ord }).eq('id', a.id)
    const r2 = await supabase.from(TABLE).update({ ord: a.ord }).eq('id', b.id)
    if (r1.error || r2.error) {
      console.error('[useAssessmentFindings] move:', r1.error?.message ?? r2.error?.message)
      void refetch()
      return false
    }
    return true
  }, [findings, refetch])

  const bulkInsertFromAi = useCallback(async (drafts: NewFindingInput[]): Promise<number> => {
    if (!assessmentId || drafts.length === 0) return 0
    const startOrd = findings.length > 0 ? Math.max(...findings.map((f) => f.ord)) + 1 : 0
    const payload = drafts.map((d, i) => ({
      assessment_id: assessmentId,
      ord: startOrd + i,
      classification: d.classification ?? 'observation',
      description: d.description ?? '',
      risk: d.risk ?? null,
      recommendation: d.recommendation ?? null,
      priority: d.priority ?? null,
      proposed_deadline: d.proposed_deadline ?? null,
      ai_generated: d.ai_generated ?? true,
    }))
    const result = await supabase.from(TABLE).insert(payload).select().returns<AssessmentFinding[]>()
    if (result.error || !result.data) {
      console.error('[useAssessmentFindings] bulk insert:', result.error?.message)
      setError("Erreur d'application des suggestions IA")
      return 0
    }
    const inserted = result.data
    setFindings((prev) => [...prev, ...inserted].sort((a, b) => a.ord - b.ord))
    return inserted.length
  }, [assessmentId, findings])

  return {
    findings,
    loading,
    error,
    addFinding,
    updateFinding,
    deleteFinding,
    moveFinding,
    bulkInsertFromAi,
    refetch,
  }
}
