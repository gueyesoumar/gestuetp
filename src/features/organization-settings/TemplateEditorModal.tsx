import { useState, lazy, Suspense } from 'react'
import { X, Plus } from 'lucide-react'
import { DOCUMENT_CATALOGS } from '../reports/document-catalogs'
import { TemplateTextsFields } from './TemplateTextsFields'
import { TemplateSectionsList } from './TemplateSectionsList'
import { useTemplateRows } from './useTemplateRows'
import type { ReportDocumentType, ReportTemplate, ReportTemplateInsert } from '../../types/database.types'
import { useToast } from '../../hooks/useToast'

const TemplatePreviewPane = lazy(() => import('./TemplatePreviewPane'))

interface Result { ok: boolean; error?: string }

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
  const [docType, setDocType] = useState<ReportDocumentType>(template?.document_type ?? 'audit_report')
  const [scope, setScope] = useState<'cabinet' | 'client'>(template?.scope ?? 'cabinet')
  const [clientId, setClientId] = useState(template?.client_id ?? '')
  const [isDefault, setIsDefault] = useState(template?.is_default ?? false)
  const { rows, setRows, toggle, setOption, setCustomField, addCustom, removeCustom, previewSections, serialize } = useTemplateRows(template, docType)
  const [texts, setTexts] = useState<Record<string, string>>(template?.texts ?? {})
  const [showTexts, setShowTexts] = useState(false)
  const [busy, setBusy] = useState(false)

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
      document_type: docType,
      scope,
      client_id: scope === 'client' ? clientId : null,
      is_default: scope === 'cabinet' ? isDefault : false,
      sections: serialize(),
      texts: cleanTexts,
    })
    setBusy(false)
    if (!res.ok) { toast.error(res.error ?? 'Enregistrement impossible'); return }
    toast.success('Modèle enregistré'); onSaved()
  }

  const field = 'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-forest-700 focus:ring-1 focus:ring-forest-700'
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{template ? 'Modifier le modèle' : 'Nouveau modèle de rapport'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 flex">
          <div className="w-full lg:w-[440px] overflow-y-auto px-5 py-4 space-y-3 border-r border-gray-100">
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Nom du modèle *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={field} autoFocus />
            </div>
            {DOCUMENT_CATALOGS.length > 1 && (
              <div>
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Type de document</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value as ReportDocumentType)} disabled={Boolean(template)} className={`${field} disabled:bg-gray-50 disabled:text-gray-400`}>
                  {DOCUMENT_CATALOGS.map((d) => <option key={d.type} value={d.type}>{d.label}</option>)}
                </select>
              </div>
            )}
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
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] font-medium text-gray-600">Sections (glisser pour réordonner, cocher pour afficher)</p>
                <button type="button" onClick={addCustom} className="inline-flex items-center gap-1 text-[11px] font-medium text-forest-700 hover:underline">
                  <Plus size={13} /> Section libre
                </button>
              </div>
              <TemplateSectionsList rows={rows} onReorder={setRows} onToggle={toggle} onOption={setOption} onCustomField={setCustomField} onRemove={removeCustom} />
            </div>
            <div>
              <button type="button" onClick={() => setShowTexts((s) => !s)} className="text-[12px] font-medium text-forest-700 hover:underline">
                {showTexts ? 'Masquer' : 'Personnaliser'} les libellés
              </button>
              {showTexts && <div className="mt-2"><TemplateTextsFields texts={texts} onChange={(k, v) => setTexts((s) => ({ ...s, [k]: v }))} /></div>}
            </div>
          </div>
          <div className="hidden lg:flex flex-1 min-h-0 flex-col bg-gray-100">
            <p className="px-4 py-2 text-[11px] font-medium text-gray-500 border-b border-gray-200 bg-white">Aperçu (données d&rsquo;illustration)</p>
            <div className="flex-1 min-h-0">
              {docType === 'audit_report' || docType === 'scoping_note' || docType === 'interview_cr' ? (
                <Suspense fallback={<div className="h-full flex items-center justify-center text-[13px] text-gray-400">Préparation de l&rsquo;aperçu...</div>}>
                  <TemplatePreviewPane documentType={docType} sections={previewSections} texts={texts} />
                </Suspense>
              ) : (
                <div className="h-full flex items-center justify-center text-[13px] text-gray-400 px-6 text-center">Aperçu disponible prochainement pour ce type de document.</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button onClick={() => void submit()} disabled={busy} className="px-4 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 disabled:opacity-50">
            {busy ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
