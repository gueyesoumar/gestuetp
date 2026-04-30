import { useEffect, useState } from 'react'
import { Modal } from '../../../../components/ui/Modal'
import { CARTimeline } from '../../../missions/closure/CARTimeline'
import type { CorrectiveActionRequest } from '../../../../types/database.types'

interface ClientContact {
  id: string
  contact_name: string | null
  email: string
}

interface ClientCARDialogProps {
  car: CorrectiveActionRequest | null
  canContribute: boolean
  contacts: ClientContact[]
  userNames?: Map<string, string>
  contactNames?: Map<string, string>
  busy: boolean
  onClose: () => void
  onSubmit: (carId: string, payload: { rootCause: string; action: string; targetDate: string; responsibleId: string | null }) => Promise<boolean>
}

const CLASS_LABEL: Record<string, string> = {
  major_nc: 'NC majeure',
  minor_nc: 'NC mineure',
  observation: 'Observation',
}

export function ClientCARDialog({ car, canContribute, contacts, userNames, contactNames, busy, onClose, onSubmit }: ClientCARDialogProps): JSX.Element | null {
  const [rootCause, setRootCause] = useState('')
  const [action, setAction] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [responsibleId, setResponsibleId] = useState<string>('')

  useEffect(() => {
    if (car) {
      setRootCause(car.client_root_cause ?? '')
      setAction(car.client_action ?? '')
      setTargetDate(car.client_target_date ?? '')
      setResponsibleId(car.client_responsible_id ?? '')
    }
  }, [car])

  if (!car) return null

  const canEdit = canContribute && (car.status === 'open' || car.verification_status === 'rejected' || (car.status === 'open' && !!car.verification_comment))

  const handleSubmit = async (): Promise<void> => {
    if (!action.trim()) return
    const ok = await onSubmit(car.id, {
      rootCause: rootCause.trim(),
      action: action.trim(),
      targetDate: targetDate || '',
      responsibleId: responsibleId || null,
    })
    if (ok) onClose()
  }

  return (
    <Modal open={!!car} onClose={onClose} title={`${car.code} — ${CLASS_LABEL[car.finding_classification] ?? car.finding_classification}`}>
      <div className="space-y-4">
        <CARTimeline car={car} userNames={userNames} contactNames={contactNames} />

        <div className="border border-gray-200 rounded-lg p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">Constat de l&apos;auditeur</p>
          {car.control_code && (
            <p className="text-xs font-semibold text-forest-700 mb-1">{car.control_code} — {car.control_name ?? ''}</p>
          )}
          <p className="text-sm text-gray-700 whitespace-pre-line">{car.description}</p>
        </div>

        {car.verification_comment && car.verification_status !== 'accepted' && (
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded p-3">
            <p className="text-xs font-bold text-amber-800 mb-1">
              {car.verification_status === 'rejected' ? 'Action rejetée — motif' : 'Précision demandée'}
            </p>
            <p className="text-sm text-amber-900 whitespace-pre-line">{car.verification_comment}</p>
          </div>
        )}

        {canEdit ? (
          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Votre réponse</p>
            <Field label="Cause racine">
              <textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={2}
                className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
                placeholder="Pourquoi cette non-conformité est-elle survenue ?" />
            </Field>
            <Field label="Action prévue *">
              <textarea value={action} onChange={(e) => setAction(e.target.value)} rows={3}
                className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:border-forest-700 focus:ring-1 focus:ring-forest-700"
                placeholder="Décrivez l’action que vous prévoyez de mettre en œuvre." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date cible">
                <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:border-forest-700 focus:ring-1 focus:ring-forest-700" />
              </Field>
              <Field label="Responsable interne">
                <select value={responsibleId} onChange={(e) => setResponsibleId(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:border-forest-700 focus:ring-1 focus:ring-forest-700">
                  <option value="">— Optionnel —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.contact_name ?? c.email}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} disabled={busy}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                Annuler
              </button>
              <button onClick={() => void handleSubmit()} disabled={busy || !action.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-800 disabled:opacity-50">
                {busy ? 'Envoi...' : 'Soumettre la réponse'}
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">Votre réponse</p>
            {car.client_action ? (
              <div className="space-y-2 text-sm">
                {car.client_root_cause && <Field label="Cause racine"><p className="text-gray-700 whitespace-pre-line">{car.client_root_cause}</p></Field>}
                <Field label="Action prévue"><p className="text-gray-700 whitespace-pre-line">{car.client_action}</p></Field>
                {car.client_target_date && <Field label="Date cible"><p className="text-gray-700">{new Date(car.client_target_date).toLocaleDateString('fr-FR')}</p></Field>}
                {car.client_responsible_id && contactNames && contactNames.get(car.client_responsible_id) && (
                  <Field label="Responsable"><p className="text-gray-700">{contactNames.get(car.client_responsible_id)}</p></Field>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Aucune réponse soumise.</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  )
}
