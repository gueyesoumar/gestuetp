import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { PUBLIC_SECTORS, SCORE_DIMENSION_LABELS } from '../../lib/constants'
import type { ScoreDimensionKey } from '../../lib/constants'
import type { ScenarioTemplateRow, TemplateInput, TemplateNode } from './useScenarioTemplates'

interface Props {
  template: ScenarioTemplateRow | null
  loadNodes: (id: string) => Promise<TemplateNode[]>
  onSave: (input: TemplateInput, id?: string) => Promise<{ ok: boolean; error?: string }>
  onClose: () => void
}

const toLines = (nodes: TemplateNode[], t: 'cause' | 'consequence'): string =>
  nodes.filter((n) => n.node_type === t).map((n) => n.label).join('\n')
const linesToNodes = (causes: string, cons: string): TemplateNode[] => [
  ...causes.split('\n').map((l) => l.trim()).filter(Boolean).map((label, i) => ({ node_type: 'cause' as const, label, position: i })),
  ...cons.split('\n').map((l) => l.trim()).filter(Boolean).map((label, i) => ({ node_type: 'consequence' as const, label, position: i })),
]

/** Création / édition d'un modèle de scénario (régulateur). */
export function TemplateFormModal({ template, loadNodes, onSave, onClose }: Props): JSX.Element {
  const [title, setTitle] = useState(template?.title ?? '')
  const [sectors, setSectors] = useState<string[]>(template?.sectors ?? [])
  const [dimension, setDimension] = useState<string>(template?.dimension ?? 'security')
  const [v, setV] = useState(template?.suggested_likelihood ?? 2)
  const [i, setI] = useState(template?.suggested_impact ?? 2)
  const [vuln, setVuln] = useState(template?.vulnerability ?? '')
  const [causes, setCauses] = useState('')
  const [cons, setCons] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!template) return
    void loadNodes(template.id).then((n) => { setCauses(toLines(n, 'cause')); setCons(toLines(n, 'consequence')) })
  }, [template, loadNodes])

  const toggleSector = (s: string): void => setSectors((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])

  async function submit(): Promise<void> {
    if (!title.trim()) { setErr('Intitulé requis.'); return }
    setBusy(true); setErr(null)
    const res = await onSave({
      title: title.trim(), sectors, dimension, suggested_likelihood: v, suggested_impact: i,
      vulnerability: vuln.trim() || null, is_active: true, nodes: linesToNodes(causes, cons),
    }, template?.id)
    setBusy(false)
    if (!res.ok) { setErr(res.error ?? 'Enregistrement impossible.'); return }
    onClose()
  }

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700'
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{template ? 'Modifier le modèle' : 'Nouveau modèle'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Intitulé *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="ex. Rançongiciel paralysant les services publics" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Secteurs <span className="font-normal text-gray-400">(aucun coché = tous secteurs)</span></label>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 p-2 grid grid-cols-2 gap-1">
              {PUBLIC_SECTORS.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-[12px] text-gray-700">
                  <input type="checkbox" checked={sectors.includes(s)} onChange={() => toggleSector(s)} className="rounded border-gray-300 text-forest-600" /> {s}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Dimension</label>
              <select value={dimension} onChange={(e) => setDimension(e.target.value)} className={field}>
                {(Object.keys(SCORE_DIMENSION_LABELS) as ScoreDimensionKey[]).map((k) => <option key={k} value={k}>{SCORE_DIMENSION_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Vraisemblance</label>
              <select value={v} onChange={(e) => setV(Number(e.target.value))} className={field}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Impact</label>
              <select value={i} onChange={(e) => setI(Number(e.target.value))} className={field}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Causes <span className="font-normal text-gray-400">(une par ligne)</span></label>
              <textarea rows={3} value={causes} onChange={(e) => setCauses(e.target.value)} className={field} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Conséquences <span className="font-normal text-gray-400">(une par ligne)</span></label>
              <textarea rows={3} value={cons} onChange={(e) => setCons(e.target.value)} className={field} />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Vulnérabilité type <span className="font-normal text-gray-400">(optionnel)</span></label>
            <input value={vuln} onChange={(e) => setVuln(e.target.value)} className={field} />
          </div>
          {err && <p className="text-[12px] text-red-600">{err}</p>}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button onClick={submit} disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">{busy ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  )
}
