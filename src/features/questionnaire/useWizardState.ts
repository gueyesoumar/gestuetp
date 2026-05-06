import { useState, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { Question, QuestionnaireSkipReason } from '../../types/database.types'
import type { QuestionnaireResponseData } from '../missions/useMissionQuestionnaire'

interface UseWizardStateResult {
  currentIndex: number
  currentQuestion: Question | null
  responses: Map<string, unknown>
  skipReasons: Map<string, QuestionnaireSkipReason>
  prefilled: Set<string>
  currentSection: number
  sections: { label: string; code: string; count: number }[]
  sectionLabel: string
  canGoNext: boolean
  canGoPrev: boolean
  isLast: boolean
  setResponse: (code: string, value: unknown) => void
  setSkip: (code: string, reason: QuestionnaireSkipReason | null) => void
  goNext: () => void
  goPrev: () => void
  goTo: (index: number) => void
  saving: boolean
}

const SECTION_LABELS: Record<string, string> = {
  GOV: 'Gouvernance SSI',
  MAT: 'Maturité & historique',
  OPS: 'Sécurité opérationnelle',
  INC: 'Incidents & continuité',
  ATT: 'Attentes & contraintes',
}

function buildInitialMaps(rows: QuestionnaireResponseData[] | undefined): {
  responses: Map<string, unknown>
  skipReasons: Map<string, QuestionnaireSkipReason>
  prefilled: Set<string>
} {
  const responses = new Map<string, unknown>()
  const skipReasons = new Map<string, QuestionnaireSkipReason>()
  const prefilled = new Set<string>()
  for (const r of rows ?? []) {
    const val = r.response
    if (val && typeof val === 'object' && 'value' in val && (val as { value: unknown }).value !== null) {
      responses.set(r.question_code, (val as { value: unknown }).value)
    }
    if (r.skip_reason) skipReasons.set(r.question_code, r.skip_reason)
    if (r.is_prefilled) prefilled.add(r.question_code)
  }
  return { responses, skipReasons, prefilled }
}

export function useWizardState(
  questions: Question[],
  instanceId: string | null,
  userId: string | null,
  initialRows?: QuestionnaireResponseData[],
): UseWizardStateResult {
  const [currentIndex, setCurrentIndex] = useState(0)
  const initial = useMemo(() => buildInitialMaps(initialRows), [initialRows])
  const [responses, setResponses] = useState<Map<string, unknown>>(initial.responses)
  const [skipReasons, setSkipReasons] = useState<Map<string, QuestionnaireSkipReason>>(initial.skipReasons)
  const [prefilled] = useState<Set<string>>(initial.prefilled)
  const [saving, setSaving] = useState(false)

  const sections = useMemo(() => {
    const seen = new Map<string, number>()
    for (const q of questions) {
      const code = q.code.split('-')[0]
      seen.set(code, (seen.get(code) ?? 0) + 1)
    }
    return Array.from(seen.entries()).map(([code, count]) => ({
      code,
      label: SECTION_LABELS[code] ?? code,
      count,
    }))
  }, [questions])

  const currentQuestion = questions[currentIndex] ?? null
  const currentSectionCode = currentQuestion?.code.split('-')[0] ?? ''
  const currentSection = sections.findIndex((s) => s.code === currentSectionCode)
  const sectionLabel = SECTION_LABELS[currentSectionCode] ?? ''
  const isLast = currentIndex === questions.length - 1
  const canGoNext = currentIndex < questions.length - 1
  const canGoPrev = currentIndex > 0

  const persist = useCallback(async (
    code: string,
    value: unknown,
    skipReason: QuestionnaireSkipReason | null,
  ): Promise<void> => {
    if (!instanceId || !userId) return
    setSaving(true)
    const { error } = await supabase
      .from('questionnaire_responses')
      .upsert({
        instance_id: instanceId,
        question_code: code,
        response: { value },
        skip_reason: skipReason,
        responded_by: userId,
      }, { onConflict: 'instance_id,question_code' })
    if (error) {
      console.error('[useWizardState] persist:', error.message)
    }
    setSaving(false)
  }, [instanceId, userId])

  const setResponse = useCallback((code: string, value: unknown) => {
    setResponses((prev) => {
      const next = new Map(prev)
      next.set(code, value)
      return next
    })
    setSkipReasons((prev) => {
      if (!prev.has(code)) return prev
      const next = new Map(prev)
      next.delete(code)
      return next
    })
    void persist(code, value, null)
  }, [persist])

  const setSkip = useCallback((code: string, reason: QuestionnaireSkipReason | null) => {
    setSkipReasons((prev) => {
      const next = new Map(prev)
      if (reason === null) next.delete(code)
      else next.set(code, reason)
      return next
    })
    setResponses((prev) => {
      if (!prev.has(code)) return prev
      const next = new Map(prev)
      next.delete(code)
      return next
    })
    void persist(code, null, reason)
  }, [persist])

  const goNext = useCallback(() => {
    if (canGoNext) setCurrentIndex((i) => i + 1)
  }, [canGoNext])

  const goPrev = useCallback(() => {
    if (canGoPrev) setCurrentIndex((i) => i - 1)
  }, [canGoPrev])

  const goTo = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) setCurrentIndex(index)
  }, [questions.length])

  return {
    currentIndex, currentQuestion, responses, skipReasons, prefilled,
    currentSection, sections, sectionLabel, canGoNext, canGoPrev, isLast,
    setResponse, setSkip, goNext, goPrev, goTo, saving,
  }
}
