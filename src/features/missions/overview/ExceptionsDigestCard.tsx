import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useMissionEvidenceRequests } from '../useMissionEvidenceRequests'

interface ExceptionsDigestCardProps {
  missionId: string
  onOpen: () => void
}

/** Carte cockpit : preuves en exception (refusées = contestées, ou encore en attente). */
export function ExceptionsDigestCard({ missionId, onOpen }: ExceptionsDigestCardProps): JSX.Element | null {
  const { requests, loading } = useMissionEvidenceRequests(missionId)

  if (loading) return null
  const declined = requests.filter((r) => r.status === 'declined_by_client').length
  const pending = requests.filter((r) => r.status === 'pending').length
  if (declined === 0 && pending === 0) return null

  return (
    <button
      onClick={onOpen}
      className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-4 text-left hover:border-amber-300 hover:bg-amber-50/40 transition-colors"
    >
      <span className="shrink-0 h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
        <AlertTriangle size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-gray-900">Exceptions</p>
        <p className="text-[12.5px] text-gray-500">
          {declined > 0 && (
            <span className="text-amber-700 font-medium">
              {declined} preuve{declined > 1 ? 's' : ''} refusée{declined > 1 ? 's' : ''}
            </span>
          )}
          {declined > 0 && pending > 0 && ' · '}
          {pending > 0 && <span>{pending} en attente</span>}
        </p>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-forest-700">
        Traiter <ArrowRight size={15} />
      </span>
    </button>
  )
}
