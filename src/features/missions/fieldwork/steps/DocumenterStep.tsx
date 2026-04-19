import { useRef, useState } from 'react'
import { ErrorAlert } from '../../../../components/ui/ErrorAlert'
import type { Document } from '../../../../types/database.types'

interface DocumenterStepProps {
  evidenceNotes: string
  onEvidenceNotesChange: (value: string) => void
  documents: Document[]
  uploading: boolean
  uploadError: string | null
  onUpload: (file: File, description: string) => Promise<boolean>
  onDelete: (docId: string, filePath: string) => Promise<boolean>
  readOnly: boolean
}

export function DocumenterStep({ evidenceNotes, onEvidenceNotesChange, documents, uploading, uploadError, onUpload, onDelete, readOnly }: DocumenterStepProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [desc, setDesc] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [sizeWarning, setSizeWarning] = useState<string | null>(null)

  const MAX_SIZE_IA = 5 * 1024 * 1024 // 5 Mo — limite Edge Function free tier

  const handleFile = async (file: File) => {
    setSizeWarning(null)
    if (file.size > MAX_SIZE_IA) {
      setSizeWarning(`Le fichier "${file.name}" fait ${(file.size / 1024 / 1024).toFixed(1)} Mo. Les fichiers > 5 Mo ne sont pas analys\u00e9s par l\u2019IA (limite serveur). Compressez-le via ilovepdf.com pour une analyse compl\u00e8te.`)
    }
    const ok = await onUpload(file, desc)
    if (ok) { setDesc(''); if (fileRef.current) fileRef.current.value = '' }
  }

  return (
    <div>
      <h4 className="text-[13px] font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
        {'\uD83D\uDCCE'} Documenter
      </h4>
      <p className="text-xs text-gray-300 mb-4 leading-relaxed">
        Ajoutez les preuves. Les documents seront analys{'\u00e9'}s par l{'\u2019'}IA lors de l{'\u2019'}{'\u00e9'}tape Analyser.
      </p>

      {uploadError && <div className="mb-3"><ErrorAlert message={uploadError} /></div>}
      {sizeWarning && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 leading-relaxed">
          {'\u26A0'} {sizeWarning}
        </div>
      )}

      {/* Uploaded files */}
      {documents.length > 0 && (
        <div className="mb-4 space-y-1.5">
          <p className="text-xs font-medium text-gray-500">{documents.length} document{documents.length > 1 ? 's' : ''} joint{documents.length > 1 ? 's' : ''}</p>
          {documents.map((doc) => (
            <div key={doc.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${doc.file_size && doc.file_size > MAX_SIZE_IA ? 'bg-amber-50 border border-amber-200' : 'bg-forest-50 border border-forest-200'}`}>
              <FileIcon mimeType={doc.mime_type} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{doc.file_name}</p>
                {doc.description && <p className="text-[10px] text-gray-400 truncate">{doc.description}</p>}
              </div>
              <span className="text-[10px] text-gray-300 shrink-0">{formatSize(doc.file_size)}</span>
              {doc.file_size && doc.file_size > MAX_SIZE_IA ? (
                <span className="text-[9px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">{'\u26A0'} Trop gros</span>
              ) : (
                <span className="text-[9px] font-medium text-forest-600 bg-forest-100 px-1.5 py-0.5 rounded shrink-0">{'\u2713'} IA</span>
              )}
              {!readOnly && (
                <button onClick={() => onDelete(doc.id, doc.file_path)}
                  className="text-gray-300 hover:text-red-500 transition-colors shrink-0" title="Supprimer">
                  {'\u2715'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      {!readOnly && (
        <>
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Description du document (optionnel)"
            className="w-full px-3 py-2 mb-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500" />

          <div
            className={`border-2 border-dashed rounded-xl p-5 text-center mb-4 transition-colors cursor-pointer ${dragOver ? 'border-forest-500 bg-forest-50' : 'border-gray-200 hover:border-forest-300 hover:bg-forest-50'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-forest-300 border-t-forest-700 rounded-full animate-spin" />
                <span className="text-xs text-forest-700 font-medium">Upload en cours...</span>
              </div>
            ) : (
              <>
                <p className="text-xl text-gray-300 mb-1">{'\uD83D\uDCCE'}</p>
                <p className="text-[13px] text-gray-500">
                  Glissez-d{'\u00e9'}posez ou <span className="text-forest-700 font-medium underline">parcourir</span>
                </p>
                <p className="text-[11px] text-gray-300 mt-1">PDF, images, Excel, Word {'\u2014'} 25 Mo max</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.xlsx,.xls,.csv,.doc,.docx" onChange={() => { const f = fileRef.current?.files?.[0]; if (f) handleFile(f) }} disabled={uploading} />
        </>
      )}

      {/* Notes */}
      <div>
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Notes sur les preuves</label>
        <p className="text-[10px] text-gray-300 mb-1.5">D{'\u00e9'}crivez le contenu des documents et leur pertinence.</p>
        <textarea value={evidenceNotes} onChange={(e) => onEvidenceNotesChange(e.target.value)} disabled={readOnly}
          placeholder="Ex : La PSSI v2 couvre 10 domaines mais ne mentionne pas le BYOD..."
          className="w-full min-h-[80px] px-4 py-3 border border-gray-200 rounded-xl text-[13px] text-gray-700 leading-relaxed outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-y disabled:bg-gray-50" />
      </div>
    </div>
  )
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  const t = mimeType ?? ''
  if (t.includes('pdf')) return <span className="text-red-500 text-base">{'\uD83D\uDCC4'}</span>
  if (t.includes('image')) return <span className="text-blue-500 text-base">{'\uD83D\uDDBC'}</span>
  if (t.includes('sheet') || t.includes('excel') || t.includes('csv')) return <span className="text-green-600 text-base">{'\uD83D\uDCCA'}</span>
  return <span className="text-gray-400 text-base">{'\uD83D\uDCC1'}</span>
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}
