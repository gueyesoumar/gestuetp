import { useState } from 'react'
import { useDeclareIncident } from './useIncidents'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { INCIDENT_CATEGORY_OPTIONS, INCIDENT_SEVERITY_ORDER, INCIDENT_SEVERITY_LABELS } from '../../lib/constants'

interface Assujetti { id: string; name: string }
interface Props { subsidiaries: Assujetti[]; onClose: () => void; onSuccess: () => void }

/** Déclaration d'un incident cyber par le régulateur (M5-1). */
export function IncidentDeclareModal({ subsidiaries, onClose, onSuccess }: Props): JSX.Element {
  const { declare, busy } = useDeclareIncident()
  const [error, setError] = useState<string | null>(null)
  const [entityId, setEntityId] = useState(subsidiaries[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>(INCIDENT_CATEGORY_OPTIONS[0].value)
  const [severity, setSeverity] = useState<string>('moyen')
  const [detectedAt, setDetectedAt] = useState('')
  const [description, setDescription] = useState('')
  const [affected, setAffected] = useState('')

  const submit = async (): Promise<void> => {
    if (!entityId || !title.trim()) { setError('Assujetti et titre requis'); return }
    setError(null)
    const r = await declare({
      entity_id: entityId, title: title.trim(), category, severity,
      detected_at: detectedAt ? new Date(detectedAt).toISOString() : null,
      description: description.trim() || undefined, affected_systems: affected.trim() || undefined,
    })
    if (!r.ok) { setError(r.error ?? 'Erreur lors de la déclaration'); return }
    onSuccess(); onClose()
  }

  const field = 'px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500 w-full'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-base font-bold">Déclarer un incident</h3>
          <p className="text-xs text-gray-400 mt-1">Les délais de notification sont calculés selon la gravité.</p>
        </div>
        <div className="p-5 space-y-3">
          {error && <ErrorAlert message={error} />}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Assujetti</label>
            <select value={entityId} onChange={(e) => setEntityId(e.target.value)} className={`${field} bg-white mt-1`}>
              {subsidiaries.length === 0 && <option value="">Aucun assujetti</option>}
              {subsidiaries.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intitulé de l'incident *" className={field} />
          <div className="grid grid-cols-2 gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${field} bg-white`}>
              {INCIDENT_CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={`${field} bg-white`}>
              {INCIDENT_SEVERITY_ORDER.map((s) => <option key={s} value={s}>{INCIDENT_SEVERITY_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Détecté le</label>
            <input type="datetime-local" value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} className={`${field} mt-1`} />
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" rows={3} className={field} />
          <input value={affected} onChange={(e) => setAffected(e.target.value)} placeholder="Systèmes affectés" className={field} />
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200">Annuler</button>
          <button onClick={submit} disabled={busy || subsidiaries.length === 0} className="px-4 py-2 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'Déclaration…' : 'Déclarer'}
          </button>
        </div>
      </div>
    </div>
  )
}
