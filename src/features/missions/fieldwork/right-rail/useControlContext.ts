import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { AuditChecklistItem } from '../../../../types/database.types'

export interface CadrageAnswer {
  question_id: string
  question_code: string
  question_text: string
  weight: number  // 1=context, 2=partial, 3=strong evidence
  response_value: unknown
}

export interface ControlContext {
  auditChecklist: AuditChecklistItem[]
  cadrageAnswers: CadrageAnswer[]
  hasInstance: boolean
  loading: boolean
}

export function useControlContext(missionId: string | null, controlId: string | null): ControlContext {
  const [auditChecklist, setAuditChecklist] = useState<AuditChecklistItem[]>([])
  const [cadrageAnswers, setCadrageAnswers] = useState<CadrageAnswer[]>([])
  const [hasInstance, setHasInstance] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!controlId) {
      setAuditChecklist([])
      setCadrageAnswers([])
      setHasInstance(false)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)

    const load = async (): Promise<void> => {
      // 1. Audit checklist on the control
      const ctrlRes = await supabase.from('controls')
        .select('audit_checklist')
        .eq('id', controlId)
        .abortSignal(controller.signal)
        .single()
      if (controller.signal.aborted) return
      const checklist = (ctrlRes?.data?.audit_checklist ?? []) as unknown
      const validChecklist: AuditChecklistItem[] = Array.isArray(checklist)
        ? (checklist as AuditChecklistItem[]).filter((it) => it && typeof it.label === 'string' && it.label.trim().length > 0)
        : []
      setAuditChecklist(validChecklist)

      if (!missionId) {
        setCadrageAnswers([])
        setHasInstance(false)
        setLoading(false)
        return
      }

      // 2. Find questionnaire instance for this mission
      const instRes = await supabase.from('questionnaire_instances')
        .select('id')
        .eq('mission_id', missionId)
        .limit(1)
        .abortSignal(controller.signal)
      if (controller.signal.aborted) return
      const instances = (instRes?.data ?? []) as Array<{ id: string }>
      if (instances.length === 0) {
        setHasInstance(false)
        setCadrageAnswers([])
        setLoading(false)
        return
      }
      setHasInstance(true)
      const instanceId = instances[0].id

      // 3. Get question_controls for this control + linked questions
      const linksRes = await supabase.from('question_controls')
        .select('question_id, weight, question:questions(code, text)')
        .eq('control_id', controlId)
        .abortSignal(controller.signal)
      if (controller.signal.aborted) return
      const links = (linksRes?.data ?? []) as Array<{
        question_id: string
        weight: number
        question: { code: string; text: string } | null
      }>
      if (links.length === 0) {
        setCadrageAnswers([])
        setLoading(false)
        return
      }
      const questionCodes = links
        .map((l) => l.question?.code)
        .filter((c): c is string => Boolean(c))
      if (questionCodes.length === 0) {
        setCadrageAnswers([])
        setLoading(false)
        return
      }

      // 4. Get responses for these questions in this instance — note: questionnaire_responses keys by question_code, not question_id
      const respRes = await supabase.from('questionnaire_responses')
        .select('question_code, response')
        .eq('instance_id', instanceId)
        .in('question_code', questionCodes)
        .abortSignal(controller.signal)
      if (controller.signal.aborted) return
      const responses = (respRes?.data ?? []) as Array<{ question_code: string; response: { value?: unknown } | null }>
      const responseMap = new Map<string, unknown>()
      for (const r of responses) {
        responseMap.set(r.question_code, r.response?.value ?? null)
      }

      // 5. Merge : keep only links that have a response
      const merged: CadrageAnswer[] = links
        .filter((l) => l.question?.code && responseMap.has(l.question.code))
        .map((l) => ({
          question_id: l.question_id,
          question_code: l.question?.code ?? '?',
          question_text: l.question?.text ?? '',
          weight: l.weight,
          response_value: responseMap.get(l.question?.code ?? '') ?? null,
        }))
        .sort((a, b) => b.weight - a.weight)

      setCadrageAnswers(merged)
      setLoading(false)
    }

    void load()
    return () => controller.abort()
  }, [missionId, controlId])

  return { auditChecklist, cadrageAnswers, hasInstance, loading }
}
