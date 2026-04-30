import { useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { useCARVerification, type VerifyAction } from './useCARVerification'
import type { CorrectiveActionRequest } from '../../../types/database.types'

interface CARVerificationDialogProps {
  car: CorrectiveActionRequest | null
  canVerify: boolean
  onClose: () => void
  onChanged: () => void | Promise<void>
}

const CLASS_LABEL: Record<string, string> = {
  major_nc: 'NC majeure',
  minor_nc: 'NC mineure',
  observation: 'Observation',
}

export function CARVerificationDialog({ car, canVerify, onClose, onChanged }: CARVerificationDialogProps): JSX.Element | null {
  const { busy, verify } = useCARVerification(async () => { await onChanged(); onClose() })
  const [requireComment, setRequireComment] = useState<VerifyAction | null>(null)
  const [comment, setComment] = useState('')

  if (!car) return null

  const canAct = canVerify && car.status === 'client_responded'
  const hasResponse = !!(car.client_root_cause || car.client_action || car.client_target_date)

  const submitWithComment = async (): Promise<void> => {
    if (!requireComment) return
    if (comment.trim().length < 5) return
    const ok = await verify(car.id, requireComment, comment.trim())
    if (ok) { setComment(''); setRequireComment(null) }
  }

  return (
    <Modal open={!!car} onClose={onClose} title={`${car.code} — ${CLASS_LABEL[car.finding_classification] ?? car.finding_classification}`}>
      <div className="space-y-4">
        <Section title="Constat de l'auditeur">
          {car.control_code && (
            <p className="text-xs font-semibold text-forest-700 mb-1">{car.control_code} — {car.control_name ?? ''}</p>
          )}
          <p className="text-sm text-gray-700 whitespace-pre-line">{car.description}</p>
          {car.deadline && (
            <p className="text-xs text-gray-500 mt-2">&Eacute;ch&eacute;ance demand&eacute;e : {formatDate(car.deadline)}</p>
          )}
        </Section>

        {hasResponse && (
          <Section title="R&eacute;ponse du client">
            {car.client_root_cause && <Field label="Cause racine" value={car.client_root_cause} />}
            {car.client_action && <Field label="Action pr&eacute;vue" value={car.client_action} />}
            {car.client_target_date && <Field label="Date cible" value={formatDate(car.client_target_date)} />}
          </Section>
        )}

        {car.verification_comment && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">Commentaire de v&eacute;rification</p>
            <p className="text-sm text-amber-900 whitespace-pre-line">{car.verification_comment}</p>
          </div>
        )}

        {canAct && requireComment === null && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button onClick={() => void verify(car.id, 'accept')} disabled={busy}
              className="px-3 py-2 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
              Accepter et clore
            </button>
            <button onClick={() => setRequireComment('request_precision')} disabled={busy}
              className="px-3 py-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 disabled:opacity-50">
              Demander pr&eacute;cision
            </button>
            <button onClick={() => setRequireComment('reject')} disabled={busy}
              className="px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 disabled:opacity-50">
              Rejeter
            </button>
          </div>
        )}

        {canAct && requireComment && (
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold text-gray-700">
              {requireComment === 'reject' ? 'Motif du rejet' : 'Pr&eacute;cision attendue'} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
              placeholder="Min. 5 caract&egrave;res"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setRequireComment(null); setComment('') }} disabled={busy}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => void submitWithComment()} disabled={busy || comment.trim().length < 5}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-800 disabled:opacity-50">
                {busy ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        )}

        {!canAct && (
          <p className="text-xs text-gray-400 italic">
            {car.status === 'open' && 'En attente de la r&eacute;ponse du client.'}
            {car.status === 'verified' && 'Action corrective accept&eacute;e et clos&eacute;e.'}
            {car.status === 'closed' && 'Action clos&eacute;e.'}
          </p>
        )}
      </div>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm text-gray-700 whitespace-pre-line">{value}</p>
    </div>
  )
}

function formatDate(d: string | null): string {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
