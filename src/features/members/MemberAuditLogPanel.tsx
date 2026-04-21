import { Clock } from 'lucide-react'
import { useMemberAuditLog } from './useMemberAuditLog'
import { MEMBER_AUDIT_ACTION_LABELS } from '../../lib/constants'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

interface MemberAuditLogPanelProps {
  userId: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MemberAuditLogPanel({ userId }: MemberAuditLogPanelProps) {
  const { logs, loading, error } = useMemberAuditLog(userId)

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-sm text-red-600">{error}</p>

  if (logs.length === 0) {
    return <p className="text-sm text-gray-400 py-4 text-center">Aucun historique.</p>
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3 text-sm">
          <div className="mt-0.5 flex-shrink-0">
            <Clock size={14} className="text-gray-400" />
          </div>
          <div className="min-w-0">
            <p className="text-gray-700">
              <span className="font-medium">
                {MEMBER_AUDIT_ACTION_LABELS[log.action] ?? log.action}
              </span>
              {log.performer && (
                <span className="text-gray-500">
                  {' '}par {log.performer.first_name} {log.performer.last_name}
                </span>
              )}
            </p>
            {log.details && (
              <p className="text-xs text-gray-400 mt-0.5">
                {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' &bull; ')}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
