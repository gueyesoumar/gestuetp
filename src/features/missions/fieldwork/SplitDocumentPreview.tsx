import { useState, useEffect } from 'react'
import { ExternalLink, FileText, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Document } from '../../../types/database.types'

interface SplitDocumentPreviewProps {
  documents: Document[]
}

const SIGNED_URL_TTL_SEC = 300

function previewKind(mime: string | null): 'pdf' | 'image' | 'other' {
  if (!mime) return 'other'
  if (mime.includes('pdf')) return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  return 'other'
}

export function SplitDocumentPreview({ documents }: SplitDocumentPreviewProps) {
  const [pickedId, setPickedId] = useState<string | null>(documents[0]?.id ?? null)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  const picked = documents.find((d) => d.id === pickedId) ?? null

  useEffect(() => {
    if (!picked) {
      setSignedUrl(null)
      return
    }
    let cancelled = false
    setLoadingUrl(true)
    setUrlError(null)
    setSignedUrl(null)

    supabase.storage
      .from('documents')
      .createSignedUrl(picked.file_path, SIGNED_URL_TTL_SEC)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data?.signedUrl) {
          console.error('createSignedUrl:', error?.message)
          setUrlError('Impossible de prévisualiser ce document.')
        } else {
          setSignedUrl(data.signedUrl)
        }
        setLoadingUrl(false)
      })

    return () => { cancelled = true }
  }, [picked])

  if (documents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-[#FAFAF8] border-l border-gray-200">
        <div className="text-center px-6">
          <FileText size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-[12px] text-gray-400">Aucun document à prévisualiser</p>
        </div>
      </div>
    )
  }

  const kind = picked ? previewKind(picked.mime_type) : 'other'

  return (
    <div className="h-full flex flex-col bg-[#FAFAF8] border-l border-gray-200 min-h-0">
      {/* File picker */}
      <div className="px-3 py-2 border-b border-gray-200 bg-white shrink-0">
        <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-500 mb-1">
          Document affiché
        </label>
        <select
          value={pickedId ?? ''}
          onChange={(e) => setPickedId(e.target.value || null)}
          className="w-full text-[12px] border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-forest-500 bg-white"
        >
          {documents.map((d) => (
            <option key={d.id} value={d.id}>{d.file_name}</option>
          ))}
        </select>
      </div>

      {/* Preview area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loadingUrl && (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-forest-700" />
          </div>
        )}

        {!loadingUrl && urlError && (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <AlertCircle size={24} className="text-red-400 mb-2" />
            <p className="text-[12px] text-red-700 font-medium">{urlError}</p>
            {picked && (
              <p className="text-[10px] text-gray-400 mt-1 font-mono truncate max-w-full">{picked.file_name}</p>
            )}
          </div>
        )}

        {!loadingUrl && !urlError && signedUrl && picked && kind === 'pdf' && (
          <iframe
            src={signedUrl}
            title={picked.file_name}
            className="w-full h-full border-0 bg-white"
          />
        )}

        {!loadingUrl && !urlError && signedUrl && picked && kind === 'image' && (
          <div className="h-full overflow-auto bg-gray-100 flex items-center justify-center p-2">
            <img
              src={signedUrl}
              alt={picked.file_name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}

        {!loadingUrl && !urlError && signedUrl && picked && kind === 'other' && (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center">
            <FileText size={28} className="text-gray-300 mb-2" />
            <p className="text-[12px] text-gray-500 mb-1">Prévisualisation non disponible</p>
            <p className="text-[10px] text-gray-400 font-mono truncate max-w-full mb-3">{picked.file_name}</p>
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-forest-700 bg-white border border-forest-300 hover:bg-forest-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
            >
              <ExternalLink size={11} /> Ouvrir dans un nouvel onglet
            </a>
          </div>
        )}
      </div>

      {/* Footer with file info */}
      {picked && (
        <div className="px-3 py-1.5 border-t border-gray-200 bg-white text-[10px] text-gray-400 flex items-center gap-1.5 shrink-0">
          {kind === 'image' ? <ImageIcon size={11} /> : <FileText size={11} />}
          <span className="truncate flex-1">{picked.file_name}</span>
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest-600 hover:text-forest-800 inline-flex items-center gap-1"
            >
              <ExternalLink size={10} /> Plein écran
            </a>
          )}
        </div>
      )}
    </div>
  )
}
