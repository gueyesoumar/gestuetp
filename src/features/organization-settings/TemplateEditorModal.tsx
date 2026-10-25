import { useState } from 'react'
import { X, ArrowUp, ArrowDown } from 'lucide-react'
import { SECTION_CATALOG } from '../reports/audit-report-v2/section-catalog'
import { TemplateTextsFields } from './TemplateTextsFields'
import type { ReportTemplate, ReportTemplateInsert } from '../../types/database.types'
import { useToast } from '../../hooks/useToast'

interface Row { key: string; title: string; visible: boolean }
interface Result { ok: boolean; error?: string }

function buildRows(tpl?: ReportTemplate | null): Row[] {
  const byKey = new Map(SECTION_CATALOG.map((c) => [c.key, c.title]))
  if (!tpl) return SECTION_CATALOG.map((c) => ({ key: c.key, title: c.title, visible: true }))
  const rows: Row[] = []
  for (const s of tpl.sections) {
    const title = byKey.get(s.key)
    if (title) { rows.push({ key: s.key, title, visible: s.visible }); byKey.delete(s.key) }
  }
  for (const [key, title] of byKey) rows.push({ key, title, visible: false })
  return rows
}

interface Props {
  template?: ReportTemplate | null
  clients: { id: string; name: string }[]
  onSave: (p: ReportTemplateInsert & { id?: string }) => Promise<Result>
  onClose: () => void
  onSaved: () => void
}

export function TemplateEditorModal({ template, clients, onSave, onClose, onSaved }: Props): JSX.Element {
  const toast = useToast()
  const [name, setName] = useState(template?.name ?? '')
  const [scope, setScope] = useState<'cabinet' | 'client'>(template?.scope ?? 'cabinet')
  const [clientId, setClientId] = useState(template?.client_id ?? '')
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false)
  const [rows, setRows] = useState<Row[]>(() => buildRows(template))
  const [texts, setTexts] = useState<Record<string, string>>(template?.texts ?? {})
  const [showTexts, setShowTexts] = useState(false)
  const [busy, setBusy] = useState(false)

  const move = (i: number, d: -1 | 1): void => setRows((r) => {
    const j = i + d
    if (j < 0 || j >= r.length) return r
    const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n
  })
  const toggle = (i: number): void => setRows((r) => r.map((row, k) => k === i ? { ...row, visible: !row.visible } : row))

  const submit = async (): Promise<void> => {
    if (!name.trim()) { toast.error('Le nom est requis'); return }
    if (scope === 'client' && !clientId) { toast.error('Sélectionnez un client'); return }
    setBusy(true)
    const cleanTexts = Object.fromEntries(
      Object.entries(texts).filter(([, v]) => v.trim().length > 0).map(([k, v]) => [k, v.trim()]),
    )
    const res = await onSave({
      id: template?.id,
      name: name.trim(),
      scope,
      client_id: scope === 'client' ? clientId : null,
      is_default: scope === 'cabinet' ? isDefault : false,
      sections: rows.map((r) => ({ key: r.key, visible: r.visible })),
      texts: cleanTexts,
    })
    setBusy(false)
    if (!res.ok) { toast.error(res.error ?? 'Enregistrement impossible'); return }
    toast.success('Modèle enregistré'); onSaved()
  }

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-gray-900">{template ? 'Modifier le modèle' : 'Nouveau modèle de rapport'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-600 mb-1">Nom du modèle *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} autoFocus />
          </div>
          <div className="flex gap-2">
            <select value={scope} onChange={(e) => setScope(e.target.value as 'cabinet' | 'client')} className={field}>
              <option value="cabinet">Défaut du cabinet</option>
              <option value="client">Spécifique à un client</option>
            </select>
            {scope === 'client' ? (
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={field}>
                <option value="">Sélectionner un client...</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <label className="flex items-center gap-2 text-[13px] text-gray-700 whitespace-nowrap px-2">
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Modèle par défaut
              </label>
            )}
          </div>
          <div>
            <p className="text-[12px] font-medium text-gray-600 mb-1">Sections (ordre et visibilité)</p>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-50">
              {rows.map((row, i) => (
                <div key={row.key} className="flex items-center gap-2 px-3 py-2">
                  <input type="checkbox" checked={row.visible} onChange={() => toggle(i)} />
                  <span className={`flex-1 text-[13px] ${row.visible ? 'text-gray-900' : 'text-gray-300 line-through'}`}>{row.title}</span>
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowUp size={14} /></button>
                  <button onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowDown size={14} /></button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <button type="button" onClick={() => setShowTexts((s) => !s)} className="text-[12px] font-medium text-forest-700 hover:underline">
              {showTexts ? 'Masquer' : 'Personnaliser'} les libellés
            </button>
            {showTexts && <div className="mt-2"><TemplateTextsFields texts={texts} onChange={(k, v) => setTexts((s) => ({ ...s, [k]: v }))} /></div>}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button onClick={() => void submit()} disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
