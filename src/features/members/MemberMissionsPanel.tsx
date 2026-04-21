import { Briefcase } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useMemberMissions } from './useMemberMissions'

interface MemberMissionsPanelProps {
  userId: string
}

const STATUS_LABELS: Record<string, string> = {
  initialization: 'Initialisation',
  scoping: 'Cadrage',
  planning: 'Planification',
  fieldwork: 'Terrain',
  internal_review: 'Revue interne',
  client_review: 'Revue client',
  closure: 'Clôture',
}

const STATUS_VARIANTS: Record<string, 'green' | 'blue' | 'gold' | 'gray'> = {
  initialization: 'gray',
  scoping: 'blue',
  planning: 'blue',
  fieldwork: 'gold',
  internal_review: 'gold',
  client_review: 'gold',
  closure: 'green',
}

const ROLE_LABELS: Record<string, string> = {
  associate: 'Associé',
  lead_auditor: 'Auditeur principal',
  auditor: 'Auditeur',
}

export function MemberMissionsPanel({ userId }: MemberMissionsPanelProps) {
  const { missions, loading, error } = useMemberMissions(userId)

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  if (missions.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">Aucune mission assign&eacute;e.</p>
  }

  return (
    <div className="space-y-2">
      {missions.map((mt) => (
        <div key={mt.id} className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Briefcase size={14} className="text-forest-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-900">{mt.mission.name}</span>
            </div>
            <Badge
              label={STATUS_LABELS[mt.mission.status] ?? mt.mission.status}
              variant={STATUS_VARIANTS[mt.mission.status] ?? 'gray'}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {ROLE_LABELS[mt.role] ?? mt.role}
            {mt.mission.start_date && (
              <> &mdash; {new Date(mt.mission.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</>
            )}
            {mt.mission.end_date && (
              <> au {new Date(mt.mission.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</>
            )}
          </p>
        </div>
      ))}
    </div>
  )
}
