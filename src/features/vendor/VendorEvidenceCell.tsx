import { useRef } from 'react'
import { Paperclip, X } from 'lucide-react'
import type { VendorEvidence } from './useVendorEvidence'

interface Props {
  files: VendorEvidence[]
  editable: boolean
  onUpload: (file: File) => void
  onOpen: (e: VendorEvidence) => void
  onRemove: (e: VendorEvidence) => void
}

/** Preuves attachees a un controle : liste compacte + depot (RFC 0020 Lot 3b). */
export function VendorEvidenceCell({ files, editable, onUpload, onOpen, onRemove }: Props): JSX.Element {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col items-start gap-1 min-w-[150px]">
      {files.map((e) => (
        <span key={e.id} className="inline-flex items-center gap-1 max-w-full text-[11px]">
          <button onClick={() => onOpen(e)} className="text-forest-700 hover:underline truncate max-w-[130px]" title={e.file_name}>{e.file_name}</button>
          {editable && <button onClick={() => onRemove(e)} className="text-gray-300 hover:text-red-600 shrink-0" aria-label="Retirer"><X size={12} /></button>}
        </span>
      ))}
      {editable && (
        <>
          <button onClick={() => ref.current?.click()} className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-forest-700"><Paperclip size={12} /> Ajouter</button>
          <input ref={ref} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = '' }} />
        </>
      )}
      {!editable && files.length === 0 && <span className="text-[11px] text-gray-300">-</span>}
    </div>
  )
}
