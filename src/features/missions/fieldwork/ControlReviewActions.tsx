import { useState } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import { useToast } from '../../../hooks/useToast'

type ReviewerRole = 'lead' | 'associate' | 'none'
type ReviewStage = 'lead_review' | 'associate_review'

interface ControlReviewActionsProps {
  assessmentId: string
  controlCode: string
  reviewerRole: ReviewerRole
  leadApproved: boolean
  onApprove?: (id: string, comment: string, stage?: string) => Promise<boolean>
  onReject?: (id: string, comment: string, stage?: string) => Promise<boolean>
}

export function ControlReviewActions({
  assessmentId,
  controlCode,
  reviewerRole,
  leadApproved,
  onApprove,
  onReject,
}: ControlReviewActionsProps) {
  const toast = useToast()
  const [comment, setComment] = useState('')
  const [action, setAction] = useState<'idle' | 'approving' | 'rejecting'>('idle')

  const canAct = reviewerRole === 'lead' || (reviewerRole === 'associate' && leadApproved)
  const waitingForLead = reviewerRole === 'associate' && !leadApproved
  const stage: ReviewStage = reviewerRole === 'associate' ? 'associate_review' : 'lead_review'

  const handleApprove = async () => {
    if (!onApprove || !canAct) return
    setAction('approving')
    const ok = await onApprove(assessmentId, comment, stage)
    setComment('')
    setAction('idle')
    if (ok) toast.success('Validation enregistrée', { description: controlCode })
  }

  const handleReject = async () => {
    if (!onReject || !canAct) return
    setAction('rejecting')
    const ok = await onReject(assessmentId, comment, stage)
    setComment('')
    setAction('idle')
    if (ok) toast.warn('Constat rejeté', { description: `${controlCode} · renvoyé à l'auditeur` })
  }

  return (
    <div className="px-6 py-4 border-t border-gray-200 bg-[#FAFAFA] shrink-0">
      {waitingForLead && (
        <div className="flex items-center gap-2 p-2.5 mb-3 bg-gold-50 border border-gold-200 rounded-lg">
          <AlertTriangle size={15} className="text-gold-600" />
          <p className="text-[11px] text-gold-700">En attente de la validation du chef de mission avant votre approbation.</p>
        </div>
      )}
      <div className="flex gap-2 mb-3">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Commentaire de revue (optionnel)..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500"
          disabled={!canAct}
        />
      </div>
      <div className="flex gap-2.5">
        <button
          onClick={handleApprove}
          disabled={!canAct || action !== 'idle'}
          className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-[13px] font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {action === 'approving' ? 'Validation...' : <><Check size={14} className="inline" /> Approuver</>}
        </button>
        <button
          onClick={handleReject}
          disabled={!canAct || action !== 'idle'}
          className="flex-1 px-4 py-2.5 bg-white text-red-600 border border-red-400 rounded-lg text-[13px] font-semibold hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {action === 'rejecting' ? 'Rejet...' : <><X size={14} className="inline" /> Rejeter</>}
        </button>
      </div>
    </div>
  )
}
