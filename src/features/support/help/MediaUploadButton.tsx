import { useRef } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Bouton d'upload de média + input fichier caché (réutilisé pour image et vidéo). */
interface Props {
  icon: LucideIcon
  label: string
  accept: string
  uploading: boolean
  onFile: (file: File) => void
}

export function MediaUploadButton({ icon: Icon, label, accept, uploading, onFile }: Props): JSX.Element {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={uploading}
        className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-[12px] text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      >
        <Icon size={14} /> {uploading ? 'Téléversement…' : label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }}
      />
    </>
  )
}
