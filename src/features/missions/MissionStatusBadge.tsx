import { Badge } from '../../components/ui/Badge'
import type { MissionStatus } from '../../types/database.types'

const statusConfig: Record<MissionStatus, { label: string; variant: 'blue' | 'green' | 'gray' | 'red' }> = {
  initialization: { label: 'Initialisation', variant: 'gray' },
  scoping: { label: 'Cadrage', variant: 'blue' },
  planning: { label: 'Planification', variant: 'blue' },
  fieldwork: { label: 'Travaux', variant: 'blue' },
  internal_review: { label: 'Revue interne', variant: 'blue' },
  client_review: { label: 'Validation client', variant: 'blue' },
  closure: { label: 'Cl\u00f4tur\u00e9e', variant: 'green' },
}

export function MissionStatusBadge({ status }: { status: MissionStatus }) {
  const config = statusConfig[status]
  return <Badge label={config.label} variant={config.variant} />
}
