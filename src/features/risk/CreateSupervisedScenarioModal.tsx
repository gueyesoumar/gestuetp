import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { SCORE_DIMENSION_LABELS, RISK_LIKELIHOOD_LEVELS, RISK_IMPACT_LEVELS } from '../../lib/constants'

interface Props { orgId: string; orgName: string; onClose: () => void; onCreated: () => void }

/** Le régulateur crée un risque dans le registre d'un assujetti (RFC supervision #3). */
export function CreateSupervisedScenarioModal({ orgId, orgName, onClose, onCreated }: Props): JSX.Element {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [dimension, setDimension] = useState('')
  const [likelihood, setLikelihood] = useState(2)
  const [impact, setImpact] = useState(2)
  const [vulnerability, setVulnerability] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (): Promise<void> => {
    if (!title.trim() || !dimension) return
    setBusy(true)
    const { error } = await supabase.rpc('create_supervised_scenario', {
      p_org: orgId, p_title: title.trim(), p_dimension: dimension,
      p_likelihood: likelihood, p_impact: impact,
      p_description: description.trim() || null, p_vulnerability: vulnerability.trim() || null,
    })
    setBusy(false)
    if (error) { toast.error('Création impossible', { description: error.message }); return }
    toast.success("Risque créé dans le registre de l'assujetti")
    onCreated()
    onClose()
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-2.5 py-2 text-[13px] focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Créer un risque · <span className="font-normal text-gray-500">{orgName}</span></h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1">Intitulé du risque *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Compromission des données fiscales des contribuables" className={inputCls} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1">Dimension *</label>
            <select value={dimension} onChange={(e) => setDimension(e.target.value)} className={inputCls}>
              <option value="">Choisir...</option>
              {Object.entries(SCORE_DIMENSION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Vraisemblance</label>
              <select value={likelihood} onChange={(e) => setLikelihood(Number(e.target.value))} className={inputCls}>
                {RISK_LIKELIHOOD_LEVELS.map((o) => <option key={o.value} value={o.value}>{o.value} - {o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1">Impact</label>
              <select value={impact} onChange={(e) => setImpact(Number(e.target.value))} className={inputCls}>
                {RISK_IMPACT_LEVELS.map((o) => <option key={o.value} value={o.value}>{o.value} - {o.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1">Vulnérabilité (facultatif)</label>
            <input value={vulnerability} onChange={(e) => setVulnerability(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-1">Description (facultatif)</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputCls} />
          </div>
          <p className="text-[11.5px] text-gray-400">Ce risque sera ajouté au registre de l&apos;assujetti et marqué « Régulateur ». L&apos;assujetti le verra dans son propre module Risk.</p>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="px-3 py-2 text-[13px] text-gray-500">Annuler</button>
          <button onClick={() => void submit()} disabled={busy || !title.trim() || !dimension} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50">{busy ? 'Création...' : 'Créer le risque'}</button>
        </div>
      </div>
    </div>
  )
}
