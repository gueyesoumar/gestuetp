import { useRef, useState } from 'react'
import { Upload, AlertTriangle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../hooks/useToast'

interface Props {
  cabinetId: string
  variant: 'light' | 'dark'
  currentUrl: string | null
  onUploaded: () => void
}

const ACCEPT = 'image/png,image/svg+xml'
const MAX_BYTES = 524_288

export function LogoUploadField({ cabinetId, variant, currentUrl, onUploaded }: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [reason, setReason] = useState('')
  const toast = useToast()

  const onPick = () => inputRef.current?.click()

  const onSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!file) return
    if (file.size > MAX_BYTES) {
      toast.error(`Fichier trop volumineux (max ${Math.round(MAX_BYTES / 1024)} Ko)`)
      return
    }
    if (!['image/png', 'image/svg+xml'].includes(file.type)) {
      toast.error('PNG ou SVG uniquement')
      return
    }
    setPendingFile(file)
    setReason('')
  }

  const submit = async () => {
    if (!pendingFile || !reason.trim()) return
    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const form = new FormData()
      form.append('cabinet_id', cabinetId)
      form.append('variant', variant)
      form.append('reason', reason)
      form.append('file', pendingFile)
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-cabinet-logo`
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: form,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? 'Upload impossible')
      toast.success('Logo téléversé', { description: variant === 'light' ? 'Variante fond clair' : 'Variante fond sombre' })
      setPendingFile(null)
      setReason('')
      onUploaded()
    } catch (err) {
      toast.error('Upload impossible', err)
    } finally {
      setSubmitting(false)
    }
  }

  const isDark = variant === 'dark'
  const previewBg = isDark ? '#0c1f4d' : 'white'
  const previewBorder = isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid #E5E7EB'

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-[12.5px] font-bold text-gray-900">
            {isDark ? 'Logo variante fond sombre' : 'Logo principal — fond clair'}
            {isDark && <span className="ml-2 text-[10px] font-medium text-gray-400 normal-case tracking-normal">optionnel</span>}
            {!isDark && <span className="ml-1 text-red-500">*</span>}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            {isDark ? 'Affiché sur login, hub, sidebar (fonds colorés)' : 'Affiché dans les emails, fiches mission, écrans clairs'}
          </div>
        </div>
      </div>
      <div className="p-4">
        <div
          className="rounded-lg flex items-center justify-center"
          style={{ background: previewBg, border: previewBorder, minHeight: 110 }}
        >
          {currentUrl ? (
            <img src={currentUrl} alt={`Logo ${variant}`} style={{ maxHeight: 80, maxWidth: 200, width: 'auto', height: 'auto' }} />
          ) : (
            <span className="text-[11px] text-gray-400">Aucun logo téléversé</span>
          )}
        </div>
        {!isDark && !currentUrl && (
          <div className="mt-3 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-[11.5px] text-amber-800">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <span>Le logo principal est requis avant que la marque blanche puisse être activée.</span>
          </div>
        )}
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onSelected} />
        <button
          type="button"
          onClick={onPick}
          disabled={submitting || pendingFile !== null}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg text-[12px] font-semibold hover:bg-gray-50 disabled:opacity-50"
        >
          <Upload size={13} />
          {currentUrl ? 'Remplacer le logo' : 'Téléverser un logo'}
        </button>
        <p className="mt-1.5 text-[10.5px] text-gray-400">PNG ou SVG &middot; max 500 Ko</p>
      </div>

      {pendingFile && (
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
          <div className="text-[12px] text-amber-800 mb-2">
            <b>{pendingFile.name}</b> &middot; {Math.round(pendingFile.size / 1024)} Ko
          </div>
          <label className="block text-[10.5px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Motif <span className="text-red-500">*</span></label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Pourquoi ce nouveau logo ?"
            className="w-full text-[12px]"
            disabled={submitting}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => { setPendingFile(null); setReason('') }}
              disabled={submitting}
              className="px-3 py-1.5 text-[11.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded"
            >Annuler</button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !reason.trim()}
              className="px-3 py-1.5 text-[11.5px] font-semibold bg-forest-700 text-white rounded hover:bg-forest-900 disabled:opacity-50"
            >{submitting ? 'Téléversement…' : 'Téléverser'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
