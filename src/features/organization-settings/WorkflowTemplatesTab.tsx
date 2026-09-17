import { useState } from 'react'
import { Plus, Pencil, Trash2, Route, Star } from 'lucide-react'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useToast } from '../../hooks/useToast'
import { useWorkflowTemplates } from './useWorkflowTemplates'
import { useWorkflowTemplateCrud } from './useWorkflowTemplateCrud'
import { WorkflowTemplateForm } from './WorkflowTemplateForm'
import { ALL_DESELECTABLE_KEYS } from './workflowStepCatalog'
import type { OrganizationWorkflowTemplate } from '../../types/database.types'

export function WorkflowTemplatesTab(): JSX.Element {
  const { templates, loading, error, refetch } = useWorkflowTemplates()
  const { create, update, remove, saving, deleting, error: crudError } = useWorkflowTemplateCrud(refetch)
  const toast = useToast()

  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [included, setIncluded] = useState<Set<string>>(new Set(ALL_DESELECTABLE_KEYS))
  const [deleteTarget, setDeleteTarget] = useState<OrganizationWorkflowTemplate | null>(null)

  const startCreate = (): void => {
    setEditingId(null); setName(''); setIsDefault(false); setIncluded(new Set(ALL_DESELECTABLE_KEYS)); setView('form')
  }
  const startEdit = (t: OrganizationWorkflowTemplate): void => {
    setEditingId(t.id); setName(t.name); setIsDefault(t.is_default)
    setIncluded(new Set(ALL_DESELECTABLE_KEYS.filter((k) => !t.disabled_steps.includes(k)))); setView('form')
  }
  const toggleStep = (key: string): void =>
    setIncluded((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n })

  const handleSubmit = async (): Promise<void> => {
    const input = { name, is_default: isDefault, disabled_steps: ALL_DESELECTABLE_KEYS.filter((k) => !included.has(k)) }
    const ok = editingId ? await update(editingId, input) : await create(input)
    if (ok) { toast.success(editingId ? 'Template mis à jour' : 'Template créé', { description: name }); setView('list') }
  }
  const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget) return
    const ok = await remove(deleteTarget.id)
    if (ok) toast.success('Template supprimé', { description: deleteTarget.name })
    setDeleteTarget(null)
  }

  if (loading) return <LoadingSpinner />

  if (view === 'form') {
    return (
      <div>
        {crudError && <div className="mb-3"><ErrorAlert message={crudError} /></div>}
        <h3 className="text-[15px] font-bold text-gray-900 mb-4">{editingId ? 'Modifier le template' : 'Nouveau template de parcours'}</h3>
        <WorkflowTemplateForm
          name={name} onChangeName={setName} isDefault={isDefault} onChangeDefault={setIsDefault}
          included={included} onToggleStep={toggleStep} saving={saving} isEditing={!!editingId}
          onSubmit={handleSubmit} onCancel={() => setView('list')}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <p className="text-[12.5px] text-gray-500 mb-4">
        Cr&eacute;ez des <b>parcours de mission</b> r&eacute;utilisables en d&eacute;s&eacute;lectionnant des &eacute;tapes. &Agrave; la cr&eacute;ation d&rsquo;une mission, vous choisirez le template &agrave; appliquer&nbsp;; les missions en cours ne changent pas.
      </p>
      {error && <div className="mb-3"><ErrorAlert message={error} /></div>}
      {crudError && <div className="mb-3"><ErrorAlert message={crudError} /></div>}

      <div className="space-y-2">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <Route size={15} className="text-forest-700 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-gray-900 truncate">{t.name}</span>
                {t.is_default && <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 text-gold-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"><Star size={9} className="fill-current" />Défaut</span>}
              </div>
              <div className="text-[11px] text-gray-400">{t.disabled_steps.length === 0 ? 'Parcours complet' : `${t.disabled_steps.length} étape(s) désélectionnée(s)`}</div>
            </div>
            <button onClick={() => startEdit(t)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded" title="Modifier"><Pencil size={13} /></button>
            <button
              onClick={() => setDeleteTarget(t)} disabled={t.is_default}
              className={`p-1.5 rounded ${t.is_default ? 'text-gray-200 cursor-not-allowed' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}`}
              title={t.is_default ? 'Définissez d’abord un autre défaut' : 'Supprimer'}
            ><Trash2 size={13} /></button>
          </div>
        ))}
        {templates.length === 0 && <p className="text-[12.5px] text-gray-300 py-6 text-center">Aucun template. Créez-en un pour commencer.</p>}
      </div>

      <button onClick={startCreate} className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2.5 text-[12.5px] font-semibold text-forest-700 hover:bg-page-bg">
        <Plus size={14} /> Créer un template
      </button>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full overflow-hidden shadow-xl">
            <div className="px-5 py-4">
              <h3 className="text-[14px] font-bold text-gray-900">Supprimer &laquo;&nbsp;{deleteTarget.name}&nbsp;&raquo; ?</h3>
              <p className="mt-1.5 text-[12px] text-gray-500">Les missions déjà créées avec ce template ne sont pas affectées (leur parcours est figé).</p>
            </div>
            <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={confirmDelete} disabled={deleting} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">{deleting ? 'Suppression…' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
