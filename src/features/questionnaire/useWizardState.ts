import { useState, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import type { Question } from '../../types/database.types'

interface UseWizardStateResult {
  currentIndex: number
  currentQuestion: Question | null
  responses: Map<string, unknown>
  currentSection: number
  sections: { label: string; code: string; count: number }[]
  sectionLabel: string
  canGoNext: boolean
  canGoPrev: boolean
  isLast: boolean
  setResponse: (code: string, value: unknown) => void
  goNext: () => void
  goPrev: () => void
  goTo: (index: number) => void
  saving: boolean
}

const SECTION_LABELS: Record<string, string> = {
  GOV: 'Gouvernance SSI',
  MAT: 'Maturit\u00e9 & historique',
  OPS: 'S\u00e9curit\u00e9 op\u00e9rationnelle',
  INC: 'Incidents & continuit\u00e9',
  ATT: 'Attentes & contraintes',
}

export function useWizardState(
  questions: Question[],
  instanceId: string | null,
  userId: string | null,
  initialResponses?: Map<string, unknown>
): UseWizardStateResult {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responses, setResponses] = useState<Map<string, unknown>>(initialResponses ?? new Map())
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

  const saveResponse = useCallback(async (code: string, value: unknown) => {
    if (!instanceId || !userId) return
    setSaving(true)

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token

    await fetch(`${baseUrl}/rest/v1/questionnaire_responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        instance_id: instanceId,
        question_code: code,
        response: { value },
        responded_by: userId,
      }),
    })

    setSaving(false)
  }, [instanceId, userId])

  const setResponse = useCallback((code: string, value: unknown) => {
    setResponses((prev) => {
      const next = new Map(prev)
      next.set(code, value)
      return next
    })
    saveResponse(code, value)
  }, [saveResponse])

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
    currentIndex, currentQuestion, responses, currentSection, sections,
    sectionLabel, canGoNext, canGoPrev, isLast,
    setResponse, goNext, goPrev, goTo, saving,
  }
}
