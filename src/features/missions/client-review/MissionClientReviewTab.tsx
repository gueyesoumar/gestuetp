import { ObservationsConsultationPanel } from '../observations/ObservationsConsultationPanel'
import type { MissionDetail } from '../useMissionDetail'

interface MissionClientReviewTabProps {
  mission: MissionDetail
}

/** Validation client (moteur audit) : consultation des observations non bloquantes
 *  du client audité et réponses de l'équipe. */
export function MissionClientReviewTab({ mission }: MissionClientReviewTabProps): JSX.Element {
  return (
    <ObservationsConsultationPanel
      missionId={mission.id}
      heading="Observations du client"
      subheading="Les observations du client sont non-bloquantes. Vous pouvez y répondre et décider de modifier ou conserver le constat."
      emptyLabel="Le client n’a pas encore posté d’observation."
    />
  )
}
