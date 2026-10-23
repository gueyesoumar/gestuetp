import { useState } from 'react'
import { X } from 'lucide-react'
import { ACTION_CLASSIFICATION_OPTIONS } from '../../lib/constants'
import { useManualAction } from './useActionTracking'
import { useToast } from '../../hooks/useToast'

interface Subsidiary { id: string; name: string }

interface Props {
  subsidiaries: Subsidiary[]
  /** Assujetti pre-selectionne (filtre actif) sinon choix dans le formulaire. */
  defaultEntityId?: string
  onClose: () => void
  onSaved: () => void
}

export function ManualActionModal({ subsidiaries, defaultEntityId, onClose, onSaved }: Props): JSX.Element {
  const toast = useToast()
  const { busy, create } = useManualAction()
  const [entityId, setEntityId] = useState(defaultEntityId ?? '')
  const [classification, setClassification] = useState<string>(ACTION_CLASSIFICATION_OPTIONS[0].value)
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!entityId) { toast.error('Sélectionnez un assujetti'); return }
    if (!description.trim()) { toast.error('La description est requise'); return }
    const res = await create({
      entity_id: entityId,
      finding_classification: classification,
      description: description.trim(),
      deadline: deadline || null,
    })
    if (!res.ok) { toast.error(res.error ?? 'Création impossible'); return }
    toast.success('Action créée')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nouvelle action corrective</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Assujetti *</label>
            <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className={field} disabled={!!defaultEntityId}>
              <option value="">Sélectionner un assujetti...</option>
              {subsidiaries.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Gravité *</label>
              <select value={classification} onChange={(e) => setClassification(e.target.value)} className={field}>
                {ACTION_CLASSIFICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Échéance</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Action à mener *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={field} autoFocus
              placeholder="Action corrective attendue de l'assujetti..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
              {busy ? 'Enregistrement...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
