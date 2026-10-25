import { useState } from 'react'
import { Plus, Pencil, Trash2, FileText } from 'lucide-react'
import { useReportTemplates } from './useReportTemplates'
import { TemplateEditorModal } from './TemplateEditorModal'
import { useCabinetClients } from '../clients/useCabinetClients'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useToast } from '../../hooks/useToast'
import { getSectionCatalog } from '../reports/document-catalogs'
import type { ReportTemplate } from '../../types/database.types'

export function ReportTemplatesTab(): JSX.Element {
  const { templates, loading, refresh, save, remove } = useReportTemplates()
  const { clients } = useCabinetClients()
  const toast = useToast()
  const [editing, setEditing] = useState<ReportTemplate | null | undefined>(undefined)
  const [toDelete, setToDelete] = useState<ReportTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  const clientOptions = clients.filter((c) => c.client_org_id).map((c) => ({ id: c.client_org_id as string, name: c.client_name }))
  const clientName = (id: string | null): string => clientOptions.find((c) => c.id === id)?.name ?? 'Client'

  const doDelete = async (): Promise<void> => {
    if (!toDelete) return
    setDeleting(true)
    const r = await remove(toDelete.id)
    setDeleting(false)
    if (!r.ok) { toast.error(r.error ?? 'Suppression impossible'); return }
    toast.success('Modèle supprimé'); setToDelete(null); refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-[13px] text-gray-500 max-w-xl">
          Définissez les sections du rapport d&apos;audit, leur ordre et leur visibilité. Un modèle par défaut s&apos;applique à tous les rapports du cabinet ; un modèle spécifique à un client le remplace pour ses rapports.
        </p>
        <button onClick={() => setEditing(null)} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-forest-700 rounded-lg hover:bg-forest-900 shrink-0">
          <Plus size={16} /> Nouveau modèle
        </button>
      </div>

      {loading ? <LoadingSpinner /> : templates.length === 0 ? (
        <EmptyState title="Aucun modèle" description="Sans modèle, les rapports utilisent l'ordre de sections par défaut. Créez-en un pour l'adapter." />
      ) : (
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-50">
          {templates.map((t) => {
            const visible = t.sections.filter((s) => s.visible).length
            const total = getSectionCatalog(t.document_type).length
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <FileText size={16} className="text-forest-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-[13px]">{t.name}</span>
                    {t.scope === 'cabinet' ? (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-forest-50 text-forest-700">Cabinet{t.is_default ? ' · défaut' : ''}</span>
                    ) : (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Client : {clientName(t.client_id)}</span>
                    )}
                  </div>
                  <p className="text-[11.5px] text-gray-400 mt-0.5">{visible}/{total} sections visibles</p>
                </div>
                <button onClick={() => setEditing(t)} className="text-gray-400 hover:text-forest-700 p-1" title="Modifier"><Pencil size={15} /></button>
                <button onClick={() => setToDelete(t)} className="text-gray-400 hover:text-red-600 p-1" title="Supprimer"><Trash2 size={15} /></button>
              </div>
            )
          })}
        </div>
      )}

      {editing !== undefined && (
        <TemplateEditorModal
          template={editing}
          clients={clientOptions}
          onSave={save}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); refresh() }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          open
          title="Supprimer le modèle"
          variant="danger"
          confirmLabel="Supprimer"
          busy={deleting}
          onConfirm={doDelete}
          onClose={() => setToDelete(null)}
          message={<>Le modèle <strong>{toDelete.name}</strong> sera supprimé. Les rapports concernés reviendront au modèle par défaut (ou à l&apos;ordre intégré).</>}
        />
      )}
    </div>
  )
}
