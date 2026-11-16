import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'

export type ReviewDecision = 'approved' | 'rejected'

/** Logique de décision d'une évaluation, partagée entre la modale et le mode focus.
 *  Valide le commentaire (obligatoire au rejet) et appelle l'edge review-assessment. */
export function useReviewDecision() {
  const [comment, setComment] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setComment('')
    setError(null)
  }, [])

  const decide = useCallback(async (assessmentId: string, decision: ReviewDecision): Promise<boolean> => {
    if (decision === 'rejected' && !comment.trim()) {
      setError('Un commentaire est obligatoire pour un rejet.')
      return false
    }
    setReviewing(true)
    setError(null)
    const { data, error: fnError } = await supabase.functions.invoke('review-assessment', {
      body: { assessment_id: assessmentId, decision, comment: comment || null },
    })
    if (fnError || data?.error) {
      setError(await readInvokeError(fnError, data, 'Erreur lors de la validation.'))
      setReviewing(false)
      return false
    }
    setReviewing(false)
    return true
  }, [comment])

  return { comment, setComment, reviewing, error, setError, decide, reset }
}
