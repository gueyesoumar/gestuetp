import type { ClientControlReviewApi } from './useClientControlReview'

/** Bloc de validation client_review pour l'approbateur (extrait de ControlDetailDrawer, CLAUDE.md §2). */
export function ClientReviewPanel({ review }: { review: ClientControlReviewApi }): JSX.Element {
  const { reviewComment, setReviewComment, reviewing, reviewError, handleClientReview } = review
  return (
    <div className="rounded-xl border border-forest-200 bg-forest-50 p-4 space-y-3">
      <div>
        <p className="text-[12px] font-bold text-forest-700">Validation client en attente</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          En tant qu&apos;Approbateur, vous pouvez signer ou contester ce contr{'ô'}le au nom de votre organisation.
        </p>
      </div>
      {reviewError && (
        <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded p-2">{reviewError}</p>
      )}
      <div>
        <label className="block text-[11px] font-semibold text-gray-700 mb-1">Commentaire <span className="text-gray-400 font-normal">(obligatoire en cas de rejet)</span></label>
        <textarea
          value={reviewComment}
          onChange={(e) => setReviewComment(e.target.value)}
          rows={2}
          disabled={reviewing}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-forest-500 resize-y bg-white"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleClientReview('approved')}
          disabled={reviewing}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-[12px] font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          Approuver
        </button>
        <button
          onClick={() => handleClientReview('rejected')}
          disabled={reviewing}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-[12px] font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          Rejeter
        </button>
      </div>
    </div>
  )
}
