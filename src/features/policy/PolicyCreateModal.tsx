import { useState } from 'react'
import { X, PenLine, Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { SCORE_DIMENSION_KEYS, SCORE_DIMENSION_KIND, SCORE_DIMENSION_LABELS, type ScoreDimensionKey } from '../../lib/constants'
import type { ScoreDimension } from '../../types/database.types'
import type { NewPolicy } from './usePolicyRegister'

const AXES = SCORE_DIMENSION_KEYS.filter((k) => SCORE_DIMENSION_KIND[k] === 'axis') as ScoreDimensionKey[]
type Prov = 'native' | 'imported'

export function PolicyCreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: NewPolicy) => Promise<boolean> }): JSX.Element {
  const { profile } = useAuth()
  const toast = useToast()
  const [prov, setProv] = useState<Prov>('native')
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [dimension, setDimension] = useState<ScoreDimension | ''>('governance')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Intitulé requis'); return }
    const orgId = profile?.organization_id
    if (!orgId) return
    setBusy(true)
    let file_path: string | null = null
    if (prov === 'imported') {
      if (!file) { setBusy(false); toast.error('Sélectionnez un fichier'); return }
      const safe = file.name.replace(/[^\w.-]+/g, '_')
      const path = `${orgId}/${Date.now()}_${safe}`
      const { error: upErr } = await supabase.storage.from('policy-documents').upload(path, file)
      if (upErr) { setBusy(false); console.error('[upload policy]', upErr.message); toast.error('Import du fichier impossible'); return }
      file_path = path
    }
    const ok = await onCreate({
      title: title.trim(), summary: summary.trim() || null, dimension: (dimension || null) as ScoreDimension | null,
      provenance: prov, content: prov === 'native' ? (content.trim() || null) : null, file_path,
    })
    setBusy(false)
    if (!ok) { toast.error('Création impossible'); return }
    toast.success('Politique créée (brouillon)')
    onClose()
  }

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-[#6D5AE6] focus:ring-1 focus:ring-[#6D5AE6]'
  const tab = (v: Prov, icon: JSX.Element, label: string): JSX.Element => (
    <button type="button" onClick={() => setProv(v)}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold rounded-lg px-3 py-2 border ${prov === v ? 'bg-[#6D5AE6] text-white border-transparent' : 'bg-white text-gray-600 border-gray-300 hover:border-[#6D5AE6]'}`}>
      {icon} {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nouvelle politique</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-3">
          <div className="flex gap-2">{tab('native', <PenLine size={14} />, 'Rédiger')}{tab('imported', <Upload size={14} />, 'Importer')}</div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Intitulé *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="ex. Politique de contrôle d'accès" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Dimension</label>
              <select value={dimension} onChange={(e) => setDimension(e.target.value as ScoreDimension)} className={field}>
                <option value="">—</option>
                {AXES.map((k) => <option key={k} value={k}>{SCORE_DIMENSION_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Résumé</label>
              <input value={summary} onChange={(e) => setSummary(e.target.value)} className={field} placeholder="Objet en une phrase" />
            </div>
          </div>
          {prov === 'native' ? (
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Contenu</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} className={field} placeholder="Rédigez le corps de la politique…" />
            </div>
          ) : (
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Document (.pdf, .docx, .txt)</label>
              <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-[12px] text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#6D5AE6] file:px-3 file:py-2 file:text-white file:font-semibold" />
              <p className="text-[11px] text-gray-400 mt-1.5">Une politique rédigée hors solution rejoint le registre vivant, versionnée et connectable aux contrôles.</p>
            </div>
          )}
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
