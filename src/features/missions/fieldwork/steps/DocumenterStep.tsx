import { useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { ErrorAlert } from '../../../../components/ui/ErrorAlert'
import { SensitivityBadge } from '../../../../components/ui/SensitivityBadge'
import type { Document } from '../../../../types/database.types'

interface DocumenterStepProps {
  documents: Document[]
  uploading: boolean
  uploadError: string | null
  onUpload: (file: File, description: string) => Promise<boolean>
  onDelete: (docId: string, filePath: string) => Promise<boolean>
  readOnly: boolean
}

/**
 * Documents additionnels (hors preuves attendues) : liste compacte + bouton d'ajout.
 * Le dépôt des preuves attendues se fait depuis leur propre bouton (ExpectedEvidenceSection).
 */
export function DocumenterStep({ documents, uploading, uploadError, onUpload, onDelete, readOnly }: DocumenterStepProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  // Documents non rattachés à une preuve canonique (les preuves attendues sont listées à part).
  const others = documents.filter((d) => !d.evidence_item_id)

  const handleFile = async (): Promise<void> => {
    const f = fileRef.current?.files?.[0]
    if (!f) return
    const ok = await onUpload(f, '')
    if (ok && fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Autres documents</p>
        {!readOnly && (
          <>
            <input ref={fileRef} type="file" className="hidden" disabled={uploading}
              accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.xlsx,.xls,.csv,.doc,.docx"
              onChange={() => void handleFile()} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-forest-700 hover:text-forest-900 disabled:opacity-50">
              <Plus size={12} /> {uploading ? 'Ajout…' : 'Ajouter un document'}
            </button>
          </>
        )}
      </div>

      {uploadError && <div className="mb-2"><ErrorAlert message={uploadError} /></div>}

      {others.length > 0 ? (
        <ul className="space-y-1.5">
          {others.map((doc) => (
            <li key={doc.id} className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-white px-3 py-2">
              <FileIcon mimeType={doc.mime_type} />
              <span className="flex-1 min-w-0 text-[11.5px] font-medium text-gray-900 truncate">{doc.file_name}</span>
              <SensitivityBadge
                level={doc.ai_sensitivity}
                counts={{ pii: doc.ai_pii_count, financial: doc.ai_financial_count, secret: doc.ai_secret_count }}
                categories={doc.ai_detected_categories}
              />
              <span className="text-[10px] text-gray-300 shrink-0">{formatSize(doc.file_size)}</span>
              {!readOnly && (
                <button type="button" onClick={() => void onDelete(doc.id, doc.file_path)}
                  className="text-gray-400 hover:text-red-600 shrink-0" aria-label="Supprimer"><X size={14} /></button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[10px] text-gray-400 italic">Aucun autre document.</p>
      )}
    </div>
  )
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  const t = mimeType ?? ''
  if (t.includes('pdf')) return <span className="text-red-500 text-sm shrink-0">{'📄'}</span>
  if (t.includes('image')) return <span className="text-blue-500 text-sm shrink-0">{'🖼'}</span>
  if (t.includes('sheet') || t.includes('excel') || t.includes('csv')) return <span className="text-green-600 text-sm shrink-0">{'📊'}</span>
  return <span className="text-gray-400 text-sm shrink-0">{'📁'}</span>
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
