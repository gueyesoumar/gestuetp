import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { SUPPORT_NATURE_LABELS, SUPPORT_STATUS_LABELS } from '../../lib/constants'
import { SupportConversation } from './SupportConversation'
import type { SupportRequest, SupportStatus } from '../../types/database.types'

interface Props {
  request: SupportRequest
  onBack: () => void
  /** Absent en mode lecture seule (cote demandeur). */
  onStatus?: (status: SupportStatus) => void
  /** Panneau de fulfillment optionnel (injecte cote owner). */
  fulfillment?: ReactNode
  /** Cote demandeur : masque le pied d'actions de statut. */
  readOnly?: boolean
  /** Libelle du bouton retour (defaut: « File » cote traitant). */
  backLabel?: string
}

const ACTIONS: { status: SupportStatus; label: string; prim?: boolean }[] = [
  { status: 'in_progress', label: 'Prendre en charge' },
  { status: 'resolved', label: 'Marquer résolu', prim: true },
  { status: 'escalated', label: 'Escalader' },
  { status: 'closed', label: 'Fermer' },
]

export function SupportRequestDetail({ request, onBack, onStatus, fulfillment, readOnly, backLabel = 'File' }: Props): JSX.Element {
  const context = Object.entries(request.context ?? {}).filter(([, v]) => v != null && v !== '')

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 mb-4 hover:text-gray-600">
        <ArrowLeft size={15} /> {backLabel}
      </button>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full">
              {SUPPORT_NATURE_LABELS[request.nature]}
            </span>
            <span className="text-[11px] font-semibold text-gray-500">{SUPPORT_STATUS_LABELS[request.status]}</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{request.title}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
            #{request.id.slice(0, 8)} &middot; {new Date(request.created_at).toLocaleString('fr-FR')}
          </p>
        </div>

        <div className="p-4 space-y-2 text-[13px]">
          {request.subtype && <p><span className="text-gray-400">Type&nbsp;:</span> {request.subtype}</p>}
          {request.body && <p className="text-gray-700 whitespace-pre-wrap">{request.body}</p>}
          {request.role_at_submit && <p><span className="text-gray-400">Origine&nbsp;:</span> {request.role_at_submit}</p>}
          {context.length > 0 && (
            <div className="font-mono text-[11px] text-gray-500 bg-gray-50 rounded-lg p-2.5">
              {context.map(([k, v]) => <div key={k}>{k}: {String(v)}</div>)}
            </div>
          )}
        </div>

        {fulfillment}

        <SupportConversation requestId={request.id} requesterId={request.requester_user_id} />

        {!readOnly && onStatus && (
          <div className="flex flex-wrap gap-2 p-4 border-t border-gray-100">
            {ACTIONS.map((a) => (
              <button
                key={a.status}
                onClick={() => onStatus(a.status)}
                disabled={request.status === a.status}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 ${
                  a.prim ? 'bg-forest-700 text-white hover:bg-forest-900' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
