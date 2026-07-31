import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'

export interface ClientControlReviewApi {
  reviewComment: string
  setReviewComment: (v: string) => void
  reviewing: boolean
  reviewError: string | null
  handleClientReview: (decision: 'approved' | 'rejected') => Promise<void>
}

/**
 * Flux de validation client_review (approbateur) d'un contrôle.
 * Extrait de ControlDetailDrawer (CLAUDE.md §2). Comportement inchangé.
 * `onReviewed` est appelé après une décision réussie.
 */
export function useClientControlReview(
  assessmentId: string | null,
  onReviewed: () => void,
): ClientControlReviewApi {
  const [reviewComment, setReviewComment] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  const handleClientReview = useCallback(async (decision: 'approved' | 'rejected'): Promise<void> => {
    if (!assessmentId) return
    if (decision === 'rejected' && !reviewComment.trim()) {
      setReviewError('Un commentaire est obligatoire pour un rejet.')
      return
    }
    setReviewError(null)
    setReviewing(true)
    const { data, error } = await supabase.functions.invoke('client-review-assessment', {
      body: {
        assessment_id: assessmentId,
        decision,
        comment: reviewComment.trim() || null,
      },
    })
    setReviewing(false)
    if (error || data?.error) {
      const msg = await readInvokeError(error, data, 'Validation impossible')
      console.error('client-review-assessment:', msg)
      setReviewError(msg)
      return
    }
    setReviewComment('')
    onReviewed()
  }, [assessmentId, reviewComment, onReviewed])

  return { reviewComment, setReviewComment, reviewing, reviewError, handleClientReview }
}
