import type { RefObject } from 'react'
import { Check, X } from 'lucide-react'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { ReviewDecision } from './useReviewDecision'

interface ReviewDecisionControlsProps {
  comment: string
  setComment: (v: string) => void
  reviewing: boolean
  error: string | null
  onDecide: (decision: ReviewDecision) => void
  textareaRef?: RefObject<HTMLTextAreaElement | null>
  onCommentKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

/** Zone de décision (commentaire + Approuver / Rejeter), partagée modale / focus. */
export function ReviewDecisionControls({
  comment, setComment, reviewing, error, onDecide, textareaRef, onCommentKeyDown,
}: ReviewDecisionControlsProps): JSX.Element {
  return (
    <div className="border-t border-gray-200 pt-4 space-y-3">
      {error && <ErrorAlert message={error} />}
      <textarea
        ref={textareaRef}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={onCommentKeyDown}
        placeholder="Commentaire (obligatoire pour un rejet)..."
        rows={2}
        disabled={reviewing}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
      />
      <div className="flex gap-3">
        <button onClick={() => onDecide('approved')} disabled={reviewing}
          className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-[13px] font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
          <Check size={14} className="inline" /> Approuver
        </button>
        <button onClick={() => onDecide('rejected')} disabled={reviewing}
          className="flex-1 bg-white text-red-600 border border-red-600 py-2.5 rounded-lg text-[13px] font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors">
          <X size={14} className="inline" /> Rejeter
        </button>
      </div>
    </div>
  )
}
