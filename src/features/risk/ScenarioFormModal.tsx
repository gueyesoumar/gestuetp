import { useState } from 'react'
import { X } from 'lucide-react'
import {
  SCORE_DIMENSION_KEYS, SCORE_DIMENSION_KIND, SCORE_DIMENSION_LABELS,
  RISK_LIKELIHOOD_LEVELS, RISK_IMPACT_LEVELS, RISK_TREATMENTS, riskExposure,
  type ScoreDimensionKey,
} from '../../lib/constants'
import { useToast } from '../../hooks/useToast'
import type { RiskCatalogEntry, ScoreDimension } from '../../types/database.types'
import type { NewScenario } from './useRiskRegister'

const AXES = SCORE_DIMENSION_KEYS.filter((k) => SCORE_DIMENSION_KIND[k] === 'axis') as ScoreDimensionKey[]

interface Props {
  catalog: RiskCatalogEntry[]
  onClose: () => void
  onCreate: (s: NewScenario) => Promise<boolean>
}

export function ScenarioFormModal({ catalog, onClose, onCreate }: Props): JSX.Element {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [dimension, setDimension] = useState<ScoreDimension | ''>('')
  const [threat, setThreat] = useState('')
  const [feared, setFeared] = useState('')
  const [vulnerability, setVulnerability] = useState('')
  const [likelihood, setLikelihood] = useState(2)
  const [impact, setImpact] = useState(2)
  const [treatment, setTreatment] = useState<NewScenario['treatment']>('untreated')
  const [busy, setBusy] = useState(false)

  const threats = catalog.filter((c) => c.kind === 'menace_type')
  const fearedEvents = catalog.filter((c) => c.kind === 'evenement_redoute')
  const exposure = riskExposure(likelihood, impact)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!title.trim() || !dimension) { toast.error('Titre et dimension requis'); return }
    setBusy(true)
    const ok = await onCreate({
      title: title.trim(), dimension: dimension as ScoreDimension,
      inherent_likelihood: likelihood, inherent_impact: impact, treatment,
      threat_ref: threat || null, feared_event_ref: feared || null, vulnerability: vulnerability || null,
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nouveau scénario de risque</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Intitulé *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="ex. Rançongiciel sur le SI de production" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Dimension *</label>
              <select value={dimension} onChange={(e) => setDimension(e.target.value as ScoreDimension)} className={field}>
                <option value="">Sélectionner…</option>
                {AXES.map((k) => <option key={k} value={k}>{SCORE_DIMENSION_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Menace (ISO 27005)</label>
              <select value={threat} onChange={(e) => setThreat(e.target.value)} className={field}>
                <option value="">—</option>
                {threats.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Événement redouté (EBIOS RM)</label>
            <select value={feared} onChange={(e) => setFeared(e.target.value)} className={field}>
              <option value="">—</option>
              {fearedEvents.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Vulnérabilité</label>
            <input value={vulnerability} onChange={(e) => setVulnerability(e.target.value)} className={field} placeholder="ex. sauvegardes non testées" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Vraisemblance</label>
              <select value={likelihood} onChange={(e) => setLikelihood(+e.target.value)} className={field}>
                {RISK_LIKELIHOOD_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.value} · {l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Impact</label>
              <select value={impact} onChange={(e) => setImpact(+e.target.value)} className={field}>
                {RISK_IMPACT_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.value} · {l.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-[12px]">
            <span className="text-gray-500">Exposition inhérente</span>
            <span className="font-bold" style={{ color: exposure >= 60 ? '#C0392B' : exposure >= 30 ? '#D4A843' : '#27AE60' }}>{exposure}/100</span>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Traitement</label>
            <select value={treatment} onChange={(e) => setTreatment(e.target.value as NewScenario['treatment'])} className={field}>
              {RISK_TREATMENTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
              {busy ? 'Ajout…' : 'Ajouter au registre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
