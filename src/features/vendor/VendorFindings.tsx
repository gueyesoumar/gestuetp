import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useVendorFindings, type NewFinding } from './useVendorFindings'
import { classificationLabel, priorityLabel, CLASSIFICATION_STYLE } from './vendorLabels'
import { VENDOR_CLASSIFICATION_OPTIONS, VENDOR_PRIORITY_OPTIONS } from '../../lib/constants'
import type { AssessmentControl } from './useVendorAssessment'

const sel = 'px-2 py-1.5 text-[12px] border border-gray-300 rounded-lg'

interface Props { assessmentId: string; controls: AssessmentControl[]; readOnly: boolean }

/** Constats d'une evaluation fournisseur : liste + ajout (RFC 0020 Lot 2b). */
export function VendorFindings({ assessmentId, controls, readOnly }: Props): JSX.Element {
  const { rows, add, remove } = useVendorFindings(assessmentId)
  const [f, setF] = useState<NewFinding>({ classification: 'minor_nc', description: '', priority: 'medium', control_id: '' })
  const [adding, setAdding] = useState(false)

  const submit = async (): Promise<void> => {
    if (!f.description.trim()) return
    setAdding(true)
    const ok = await add({ ...f, control_id: f.control_id || null })
    setAdding(false)
    if (ok) setF({ classification: 'minor_nc', description: '', priority: 'medium', control_id: '' })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-900">Constats <span className="text-gray-400 font-normal">· {rows.length}</span></h3></div>

      <div className="divide-y divide-gray-50">
        {rows.length === 0 && <p className="px-4 py-4 text-[12.5px] text-gray-400">Aucun constat.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-start gap-3 px-4 py-3">
            <span className={`shrink-0 text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${CLASSIFICATION_STYLE[r.classification] ?? 'bg-gray-100 text-gray-500'}`}>{classificationLabel(r.classification)}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-gray-900">{r.description}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {r.control_code && <span className="font-mono">{r.control_code}</span>}
                {r.priority && <span> · Priorité {priorityLabel(r.priority)}</span>}
                {r.recommendation && <span> · Reco : {r.recommendation}</span>}
              </div>
            </div>
            {!readOnly && <button onClick={() => void remove(r.id)} className="text-gray-400 hover:text-red-600 shrink-0" aria-label="Supprimer"><Trash2 size={14} /></button>}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="px-4 py-3 border-t border-gray-100 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <select value={f.classification} onChange={(e) => setF((p) => ({ ...p, classification: e.target.value }))} className={sel}>
              {VENDOR_CLASSIFICATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={f.priority ?? ''} onChange={(e) => setF((p) => ({ ...p, priority: e.target.value }))} className={sel}>
              {VENDOR_PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={f.control_id ?? ''} onChange={(e) => setF((p) => ({ ...p, control_id: e.target.value }))} className={`${sel} min-w-[140px]`}>
              <option value="">Contrôle (optionnel)</option>
              {controls.map((c) => <option key={c.control_id} value={c.control_id}>{c.control_code}</option>)}
            </select>
          </div>
          <input value={f.description} onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))} placeholder="Description du constat" className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg" />
          <input value={f.recommendation ?? ''} onChange={(e) => setF((p) => ({ ...p, recommendation: e.target.value }))} placeholder="Recommandation (optionnel)" className="w-full px-3 py-2 text-[13px] border border-gray-300 rounded-lg" />
          <button onClick={() => void submit()} disabled={adding || !f.description.trim()} className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50"><Plus size={15} /> Ajouter un constat</button>
        </div>
      )}
    </div>
  )
}
