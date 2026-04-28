import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Question } from '../../types/database.types'

export interface QuestionnaireInstanceData {
  id: string
  mission_id: string
  template_id: string
  snapshot: {
    template: { id: string; name: string; description: string | null; version: string | null }
    questions: Question[]
  }
  created_at: string
}

export type EvidenceType = 'declared_only' | 'declared_with_doc' | 'declared_with_signed_doc'

export interface QuestionnaireResponseData {
  id: string
  instance_id: string
  question_code: string
  response: Record<string, unknown> | null
  responded_by: string
  evidence_type: EvidenceType | null
  source_documents: string[] | null
  ai_confidence: number | null
  created_at: string
  updated_at: string
}

interface UseMissionQuestionnaireResult {
  instance: QuestionnaireInstanceData | null
  responses: QuestionnaireResponseData[]
  questions: Question[]
  loading: boolean
  error: string | null
  refetch: () => void
  answeredCount: number
  totalCount: number
}

export function useMissionQuestionnaire(missionId: string | undefined): UseMissionQuestionnaireResult {
  const [instance, setInstance] = useState<QuestionnaireInstanceData | null>(null)
  const [responses, setResponses] = useState<QuestionnaireResponseData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    const fetchData = async () => {
      // 1. Charger l'instance
      const { data: instData, error: instErr } = await supabase
        .from('questionnaire_instances')
        .select('*')
        .eq('mission_id', missionId)
        .limit(1)
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return

      if (instErr) {
        console.error('useMissionQuestionnaire instance:', instErr.message)
        setError('Impossible de charger le questionnaire.')
        setLoading(false)
        return
      }

      if (!instData || instData.length === 0) {
        setInstance(null)
        setLoading(false)
        return
      }

      const inst = instData[0] as unknown as QuestionnaireInstanceData
      setInstance(inst)

      // 2. Charger les reponses
      const { data: respData, error: respErr } = await supabase
        .from('questionnaire_responses')
        .select('*')
        .eq('instance_id', inst.id)
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return

      if (!respErr) {
        setResponses((respData ?? []) as unknown as QuestionnaireResponseData[])
      }

      setLoading(false)
    }

    fetchData()
    return () => abortController.abort()
  }, [missionId, refreshKey])

  const questions = instance?.snapshot?.questions ?? []
  const answeredCount = responses.length
  const totalCount = questions.length

  return { instance, responses, questions, loading, error, refetch, answeredCount, totalCount }
}
