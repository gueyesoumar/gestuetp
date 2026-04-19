import { useState, useRef } from 'react'
import { Badge } from '../../components/ui/Badge'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import type { Document } from '../../types/database.types'

interface DocumentUploadSectionProps {
  documents: Document[]
  uploading: boolean
  uploadError: string | null
  onUpload: (file: File, description: string) => Promise<boolean>
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function DocumentUploadSection({ documents, uploading, uploadError, onUpload }: DocumentUploadSectionProps) {
  const [description, setDescription] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    const ok = await onUpload(file, description)
    if (ok) {
      setDescription('')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">Documents de cadrage</h4>
      <p className="text-xs text-gray-500">
        Documents fournis par le client ou le cabinet pour le cadrage initial.
      </p>

      {uploadError && <ErrorAlert message={uploadError} />}

      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <div className="space-y-3">
          <div>
            <label htmlFor="doc-file" className="block text-sm font-medium text-gray-700">Fichier</label>
            <input
              id="doc-file"
              ref={fileRef}
              type="file"
              disabled={uploading}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-3 file:rounded file:border-0 file:bg-forest-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-forest-700 hover:file:bg-forest-100"
            />
          </div>
          <div>
            <label htmlFor="doc-desc" className="block text-sm font-medium text-gray-700">Description</label>
            <input
              id="doc-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex : Politique de s&eacute;curit&eacute; SI v2"
              disabled={uploading}
              className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rounded-md bg-forest-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-forest-900 disabled:opacity-50"
          >
            {uploading ? 'Upload en cours...' : 'Ajouter le document'}
          </button>
        </div>
      </div>

      {documents.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-3">
            <span className="text-sm font-semibold text-gray-900">
              Documents ({documents.length})
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                  {doc.description && (
                    <p className="text-xs text-gray-500">{doc.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</span>
                  <Badge label={doc.mime_type?.split('/')[1] ?? 'fichier'} variant="gray" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
