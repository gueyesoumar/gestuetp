import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { AssessmentValidation } from '../../../../types/database.types'

export interface ValidatorInfo {
  first_name: string | null
  last_name: string | null
  email: string
}

export interface UseValidationTimelineReturn {
  validations: AssessmentValidation[]
  validatorMap: Map<string, ValidatorInfo>
  loading: boolean
  error: string | null
}

export function useValidationTimeline(assessmentId: string | null): UseValidationTimelineReturn {
  const [validations, setValidations] = useState<AssessmentValidation[]>([])
  const [validatorMap, setValidatorMap] = useState<Map<string, ValidatorInfo>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!assessmentId) {
      setValidations([])
      setValidatorMap(new Map())
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    void (async () => {
      const { data: vals, error: valsError } = await supabase
        .from('assessment_validations')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('created_at', { ascending: true })
        .abortSignal(controller.signal)
      if (controller.signal.aborted) return
      if (valsError) {
        console.error('[useValidationTimeline] fetch validations:', valsError.message)
        setError('Impossible de charger l’historique de validation.')
        setLoading(false)
        return
      }

      const list = (vals ?? []) as AssessmentValidation[]
      setValidations(list)

      const userIds = Array.from(new Set(list.map((v) => v.validated_by)))
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', userIds)
          .abortSignal(controller.signal)
        if (controller.signal.aborted) return
        if (usersError) {
          console.error('[useValidationTimeline] fetch validators:', usersError.message)
          // Non-blocking: timeline still rendered without names
        } else {
          const map = new Map<string, ValidatorInfo>()
          for (const u of (users ?? []) as Array<{ id: string } & ValidatorInfo>) {
            map.set(u.id, { first_name: u.first_name, last_name: u.last_name, email: u.email })
          }
          setValidatorMap(map)
        }
      }
      setLoading(false)
    })()
    return () => controller.abort()
  }, [assessmentId])

  return { validations, validatorMap, loading, error }
}
