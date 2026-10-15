import { useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { RISK_TREATMENTS } from '../../lib/constants'
import { useToast } from '../../hooks/useToast'
import { ScenarioCoreFields, ScenarioRefFields, type ScenarioFields } from './ScenarioFieldset'
import { scenarioCompleteness } from './scenarioCompleteness'
import type { RiskCatalogEntry, ScoreDimension } from '../../types/database.types'
import type { NewScenario } from './useRiskRegister'

interface Props {
  catalog: RiskCatalogEntry[]
  onClose: () => void
  onCreate: (s: NewScenario) => Promise<boolean>
}

const INITIAL: ScenarioFields = { dimension: '', threat: '', feared: '', vulnerability: '', likelihood: 2, impact: 2 }

export function ScenarioFormModal({ catalog, onClose, onCreate }: Props): JSX.Element {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [fields, setFields] = useState<ScenarioFields>(INITIAL)
  const [treatment, setTreatment] = useState<NewScenario['treatment']>('untreated')
  const [showRefs, setShowRefs] = useState(false)
  const [busy, setBusy] = useState(false)

  const patch = (p: Partial<ScenarioFields>): void => setFields((f) => ({ ...f, ...p }))
  // Complétude en direct (mêmes critères ISO que la bande de synthèse du détail).
  const comp = scenarioCompleteness({
    threat_ref: fields.threat || null, feared_event_ref: fields.feared || null,
    asset_name: null, vulnerability: fields.vulnerability || null,
    inherent_likelihood: fields.likelihood, inherent_impact: fields.impact,
    treatment, next_review_at: null,
  })

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!title.trim() || !fields.dimension) { toast.error('Titre et dimension requis'); return }
    setBusy(true)
    const ok = await onCreate({
      title: title.trim(), dimension: fields.dimension as ScoreDimension,
      inherent_likelihood: fields.likelihood, inherent_impact: fields.impact, treatment,
      threat_ref: fields.threat || null, feared_event_ref: fields.feared || null, vulnerability: fields.vulnerability || null,
    })
    setBusy(false)
    if (!ok) { toast.error('Création impossible'); return }
    toast.success('Scénario ajouté au registre')
    onClose()
  }

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <h3 className="font-semibold text-gray-900">Nouveau scénario de risque</h3>
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-forest-50 text-forest-700 border border-forest-100 whitespace-nowrap">3 champs suffisent</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <p className="text-[12px] text-gray-500">Renseignez l&apos;essentiel maintenant (intitulé, dimension, cotation). Vous pourrez préciser et compléter le scénario plus tard depuis son détail.</p>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Intitulé *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="ex. Rançongiciel sur le SI de production" autoFocus />
          </div>
          <ScenarioCoreFields value={fields} onChange={patch} />

          <button type="button" onClick={() => setShowRefs((v) => !v)} className="flex items-center gap-1.5 text-[12px] font-semibold text-forest-700 hover:text-forest-900">
            <ChevronDown size={15} className={`transition-transform ${showRefs ? 'rotate-180' : ''}`} /> Champs optionnels (à compléter plus tard)
          </button>
          {showRefs && (
            <div className="space-y-3 rounded-lg bg-gray-50 p-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Traitement <span className="text-gray-400 font-normal">· se décide en phase « Traiter »</span></label>
                <select value={treatment} onChange={(e) => setTreatment(e.target.value as NewScenario['treatment'])} className={field}>
                  {RISK_TREATMENTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <ScenarioRefFields value={fields} onChange={patch} catalog={catalog} />
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <span className="uppercase tracking-wide">Complétude {comp.filled}/{comp.total}</span>
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full rounded-full bg-forest-700" style={{ width: `${comp.pct}%` }} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
              {busy ? 'Ajout...' : 'Ajouter au registre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
