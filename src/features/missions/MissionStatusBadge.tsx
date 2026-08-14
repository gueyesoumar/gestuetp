import { Badge } from '../../components/ui/Badge'
import type { MissionStatus } from '../../types/database.types'
import { MISSION_STATUS_LABELS } from './mission-constants'

// Variantes visuelles ; les LIBELL\u00c9S viennent de la source unique MISSION_STATUS_LABELS.
const statusVariant: Record<MissionStatus, 'blue' | 'green' | 'gray' | 'red'> = {
  initialization: 'gray',
  scoping: 'blue',
  planning: 'blue',
  fieldwork: 'blue',
  internal_review: 'blue',
  client_review: 'blue',
  closure: 'green',
}

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  return <Badge label={MISSION_STATUS_LABELS[status]} variant={statusVariant[status]} />
}
