import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Question } from '../../../types/database.types'

interface UseTemplateQuestionsResult {
  questions: Question[]
  templateName: string | null
  loading: boolean
  error: string | null
}

export function useTemplateQuestions(frameworkId: string | undefined): UseTemplateQuestionsResult {
  const [questions, setQuestions] = useState<Question[]>([])
  const [templateName, setTemplateName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!frameworkId) {
      setLoading(false)
      return
    }
    const ac = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      const { data: tpl, error: tErr } = await supabase
        .from('questionnaire_templates')
        .select('id, name')
        .eq('framework_id', frameworkId)
        .eq('is_active', true)
        .limit(1)
        .abortSignal(ac.signal)
        .maybeSingle()
      if (ac.signal.aborted) return
      if (tErr) {
        console.error('[useTemplateQuestions] template:', tErr.message)
        setError('Impossible de charger le template')
        setLoading(false)
        return
      }
      if (!tpl) {
        setQuestions([])
        setTemplateName(null)
        setLoading(false)
        return
      }
      setTemplateName(tpl.name as string)

      const { data: qs, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('template_id', tpl.id as string)
        .order('sort_order')
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (qErr) {
        console.error('[useTemplateQuestions] questions:', qErr.message)
        setError('Impossible de charger les questions')
        setLoading(false)
        return
      }
      setQuestions((qs ?? []) as unknown as Question[])
      setLoading(false)
    })()

    return () => ac.abort()
  }, [frameworkId])

  return { questions, templateName, loading, error }
}
