import { useState } from 'react'
import { X } from 'lucide-react'
import { SCORE_DIMENSION_KEYS, SCORE_DIMENSION_KIND, SCORE_DIMENSION_LABELS, type ScoreDimensionKey } from '../../lib/constants'
import { useToast } from '../../hooks/useToast'
import type { ScoreDimension } from '../../types/database.types'
import type { NewPolicy } from './usePolicyRegister'

const AXES = SCORE_DIMENSION_KEYS.filter((k) => SCORE_DIMENSION_KIND[k] === 'axis') as ScoreDimensionKey[]

export function NewPolicyModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: NewPolicy) => Promise<boolean> }): JSX.Element {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [dimension, setDimension] = useState<ScoreDimension | ''>('governance')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Intitulé requis'); return }
    setBusy(true)
    const ok = await onCreate({ title: title.trim(), summary: summary.trim() || null, dimension: (dimension || null) as ScoreDimension | null })
    setBusy(false)
    if (!ok) { toast.error('Création impossible'); return }
    toast.success('Politique créée (brouillon)')
    onClose()
  }

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nouvelle politique</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Intitulé *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="ex. Politique de contrôle d'accès" autoFocus />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Résumé</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} className={field} placeholder="Objet et champ d'application en une phrase" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Dimension</label>
            <select value={dimension} onChange={(e) => setDimension(e.target.value as ScoreDimension)} className={field}>
              <option value="">—</option>
              {AXES.map((k) => <option key={k} value={k}>{SCORE_DIMENSION_LABELS[k]}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-gray-400">Créée en <b>brouillon</b>. La rédaction (native, IA ou import) et l'approbation suivent dans le cycle de vie.</p>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-[#6D5AE6] rounded-lg hover:brightness-110 disabled:opacity-50">
              {busy ? 'Création…' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
