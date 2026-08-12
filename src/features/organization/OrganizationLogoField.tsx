import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useUploadOrgLogo } from './useUploadOrgLogo'
import { useToast } from '../../hooks/useToast'

interface Props {
  currentUrl: string | null
  canEdit: boolean
  onUploaded: () => void
}

const ACCEPT = 'image/png,image/svg+xml'
const MAX_BYTES = 524_288

/** Champ de téléversement du logo d'identité de l'organisation (affiché dans le Hub). */
export function OrganizationLogoField({ currentUrl, canEdit, onUploaded }: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading } = useUploadOrgLogo()
  const [preview, setPreview] = useState<string | null>(currentUrl)
  const toast = useToast()

  const onSelected = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_BYTES) { toast.error(`Fichier trop volumineux (max ${Math.round(MAX_BYTES / 1024)} Ko)`); return }
    if (!['image/png', 'image/svg+xml'].includes(file.type)) { toast.error('PNG ou SVG uniquement'); return }
    const res = await upload(file)
    if (!res.ok) { toast.error(res.error ?? 'Upload impossible'); return }
    setPreview(res.url ?? null)
    toast.success('Logo mis à jour')
    onUploaded()
  }

  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-[12.5px] font-bold text-gray-900">Logo de l&apos;organisation</div>
      <div className="mt-0.5 text-[11px] text-gray-500">Affiché dans le Hub. PNG ou SVG &middot; max 500 Ko.</div>
      <div className="mt-3 flex items-center gap-4">
        <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
          {preview ? (
            <img src={preview} alt="Logo de l'organisation" className="max-h-16 max-w-[112px] object-contain" />
          ) : (
            <span className="text-[11px] text-gray-400">Aucun logo</span>
          )}
        </div>
        {canEdit && (
          <div>
            <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onSelected} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload size={13} />
              {uploading ? 'Téléversement…' : preview ? 'Remplacer le logo' : 'Téléverser un logo'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
