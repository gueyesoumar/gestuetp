import { MessageSquare } from 'lucide-react'
import { ObservationThread } from './ObservationThread'
import { ClientReviewPanel } from './ClientReviewPanel'
import type { ControlObservationsApi } from './useControlObservations'
import type { ClientControlReviewApi } from './useClientControlReview'
import type { ControlWithAssessment } from './useMissionControls'

interface Props {
  control: ControlWithAssessment
  obs: ControlObservationsApi
  review: ClientControlReviewApi
  canContribute: boolean
  canApprove: boolean
}

/** Section « Observations » du drawer contrôle (extraite de ControlDetailDrawer, CLAUDE.md §2). */
export function ControlObservationsSection({ control, obs, review, canContribute, canApprove }: Props): JSX.Element {
  const isAwaitingClientReview = control.assessmentStatus === 'in_review'
  return (
    <div className="border-t border-gray-200 pt-5">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={16} className="text-forest-700" />
        <span className="text-[13px] font-semibold text-gray-900">
          Observations {obs.observations.length > 0 && <span className="text-gray-400">({obs.observations.length})</span>}
        </span>
      </div>

      {obs.loadingObs ? (
        <p className="text-xs text-gray-400 text-center py-3">Chargement...</p>
      ) : obs.observations.length > 0 && <ObservationThread observations={obs.observations} />}

      {isAwaitingClientReview && canApprove && <ClientReviewPanel review={review} />}

      {isAwaitingClientReview && !canApprove && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2.5">
          Ce contr{'ô'}le est en attente de validation par un Approbateur de votre organisation.
        </p>
      )}

      {canContribute && !control.myObservationId && (
        <div>
          <textarea
            value={obs.newObsText}
            onChange={(e) => obs.setNewObsText(e.target.value)}
            placeholder="Ajouter une observation (optionnelle)..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-none"
          />
          <p className="text-[10px] text-gray-400 mt-1.5">Votre observation sera envoy{'é'}e {'à'} l{'’'}{'é'}quipe d{'’'}audit qui pourra y r{'é'}pondre.</p>
        </div>
      )}

      {!canContribute && (
        <p className="text-[11px] text-gray-400 italic">Seuls les contributeurs peuvent ajouter des observations.</p>
      )}

      {control.myObservationId && !obs.observations.find((o) => o.id === control.myObservationId)?.response_text && (
        <div className="p-2.5 bg-forest-50 border border-forest-200 rounded-lg text-[11px] text-forest-700">
          Vous avez d{'é'}j{'à'} post{'é'} une observation. L{'’'}auditeur r{'é'}pondra prochainement.
        </div>
      )}
    </div>
  )
}
