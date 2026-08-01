import { useState } from 'react'
import { X } from 'lucide-react'
import { MEASURE_TYPE_ORDER, MEASURE_TYPE_LABELS } from '../lib/constants'
import type { MeasureType } from '../lib/constants'
import { useIssueMeasure, type Measure } from './useMeasures'
import { useToast } from '../hooks/useToast'

interface Props {
  /** Émission simple (entité) ou escalade (à partir d'une mesure source). */
  entityId?: string
  source?: Measure | null
  onClose: () => void
  onSaved: () => void
}

export function MeasureFormModal({ entityId, source, onClose, onSaved }: Props): JSX.Element {
  const toast = useToast()
  const { busy, issue, escalate } = useIssueMeasure()
  const isEscalate = !!source
  // En escalade : seuls les niveaux strictement supérieurs sont proposés.
  const allowed = isEscalate
    ? MEASURE_TYPE_ORDER.filter((t) => MEASURE_TYPE_ORDER.indexOf(t) > MEASURE_TYPE_ORDER.indexOf(source!.measure_type))
    : [...MEASURE_TYPE_ORDER]

  const [measureType, setMeasureType] = useState<MeasureType>(allowed[0])
  const [title, setTitle] = useState('')
  const [legalBasis, setLegalBasis] = useState('')
  const [deadline, setDeadline] = useState('')
  const [body, setBody] = useState('')

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Le titre est requis'); return }
    const common = { measure_type: measureType, title: title.trim(), legal_basis: legalBasis || null, deadline: deadline || null, body: body || null }
    const res = isEscalate
      ? await escalate({ measure_id: source!.id, ...common })
      : await issue({ entity_id: entityId, ...common })
    if (!res.ok) { toast.error(res.error ?? 'Action impossible'); return }
    toast.success(isEscalate ? 'Mesure escaladée' : 'Mesure émise')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(ev) => ev.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{isEscalate ? 'Escalader la mesure' : 'Émettre une mesure'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          {isEscalate && (
            <p className="text-[12px] text-gray-500">Depuis&nbsp;: <b>{MEASURE_TYPE_LABELS[source!.measure_type]}</b> — {source!.title}</p>
          )}
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Type de mesure *</label>
            <select value={measureType} onChange={(e) => setMeasureType(e.target.value as MeasureType)} className={field}>
              {allowed.map((t) => <option key={t} value={t}>{MEASURE_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Intitulé *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Base légale</label>
              <input value={legalBasis} onChange={(e) => setLegalBasis(e.target.value)} placeholder="ex. Art. 12 loi cyber" className={field} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Délai de remédiation</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Motivation / corps de l&apos;acte</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={field} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
              {busy ? 'Enregistrement…' : isEscalate ? 'Escalader' : 'Émettre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
