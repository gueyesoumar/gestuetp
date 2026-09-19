import { ObservationsConsultationPanel } from '../observations/ObservationsConsultationPanel'
import { MissionStatusTimeline } from '../MissionStatusTimeline'
import { useMissionStatusEvents } from '../useMissionStatusEvents'
import type { MissionDetail } from '../useMissionDetail'

interface MissionClientReviewTabProps {
  mission: MissionDetail
}

/** Validation client (moteur audit) : suivi de l'envoi + décisions client, puis
 *  consultation des observations non bloquantes du client et réponses de l'équipe. */
export function MissionClientReviewTab({ mission }: MissionClientReviewTabProps): JSX.Element {
  const { events } = useMissionStatusEvents(mission.id)

  return (
    <div className="space-y-6">
      <MissionStatusTimeline events={events} title="Suivi de la validation client" />
      <ObservationsConsultationPanel
        missionId={mission.id}
        heading="Observations du client"
        subheading="Les observations du client sont non-bloquantes. Vous pouvez y répondre et décider d'ajuster ou de conserver le constat."
        emptyLabel="Le client n’a pas encore posté d’observation."
      />
    </div>
  )
}
