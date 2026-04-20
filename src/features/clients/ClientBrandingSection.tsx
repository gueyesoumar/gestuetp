import { useRef, useState, useCallback } from 'react'
import { Upload, Palette, Pipette, Type, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ClientBrandingSectionProps {
  clientId: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  accentColor: string | null
  brandFont: string | null
  disabled: boolean
  onLogoUrl: (url: string | null) => void
  onPrimaryColor: (color: string | null) => void
  onSecondaryColor: (color: string | null) => void
  onAccentColor: (color: string | null) => void
  onBrandFont: (font: string | null) => void
}

export function ClientBrandingSection({
  clientId, logoUrl, primaryColor, secondaryColor, accentColor, brandFont,
  disabled, onLogoUrl, onPrimaryColor, onSecondaryColor, onAccentColor, onBrandFont,
}: ClientBrandingSectionProps): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [extracting, setExtracting] = useState(false)

  const handleUpload = useCallback(async (file: File): Promise<void> => {
    setUploading(true)
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `client-logos/${clientId}/${Date.now()}_${safeName}`

    const { error } = await supabase.storage.from('documents').upload(filePath, file)
    if (error) {
      console.error('Logo upload error:', error.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath)
    if (urlData?.publicUrl) {
      onLogoUrl(urlData.publicUrl)
    }
    setUploading(false)
  }, [clientId, onLogoUrl])

  const handleExtractColors = useCallback((): void => {
    if (!logoUrl) return
    setExtracting(true)

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) { setExtracting(false); return }

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const colors = extractDominantColors(imageData, canvas.width, canvas.height)

      if (colors.length >= 1) onPrimaryColor(colors[0])
      if (colors.length >= 2) onSecondaryColor(colors[1])
      if (colors.length >= 3) onAccentColor(colors[2])

      setExtracting(false)
    }
    img.onerror = () => setExtracting(false)
    img.src = logoUrl
  }, [logoUrl, onPrimaryColor, onSecondaryColor, onAccentColor])

  const handleRemoveLogo = useCallback((): void => {
    onLogoUrl(null)
    onPrimaryColor(null)
    onSecondaryColor(null)
    onAccentColor(null)
  }, [onLogoUrl, onPrimaryColor, onSecondaryColor, onAccentColor])

  return (
    <div className="space-y-5">
      {/* Logo upload */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-2">Logo du client</label>
        <div className="flex items-start gap-4">
          {logoUrl ? (
            <div className="relative group">
              <img src={logoUrl} alt="Logo client" className="w-24 h-24 object-contain rounded-xl border border-gray-200 bg-white p-2" />
              {!disabled && (
                <button type="button" onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ) : (
            <div
              onClick={() => !disabled && fileRef.current?.click()}
              className={`w-24 h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
                disabled ? 'border-gray-200 bg-gray-50' : 'border-forest-300 bg-forest-50 cursor-pointer hover:border-forest-500'
              }`}
            >
              {uploading ? (
                <span className="w-5 h-5 border-2 border-forest-300 border-t-forest-700 rounded-full animate-spin" />
              ) : (
                <>
                  <Upload size={18} className="text-forest-500" />
                  <span className="text-[9px] text-forest-700 font-medium">Ajouter</span>
                </>
              )}
            </div>
          )}
          <div className="flex-1">
            <p className="text-xs text-gray-400 leading-relaxed">
              Formats accept&eacute;s : PNG, SVG, JPG. Le logo sera utilis&eacute; dans les rapports d&rsquo;audit et les documents g&eacute;n&eacute;r&eacute;s.
            </p>
            {logoUrl && !disabled && (
              <button type="button" onClick={handleExtractColors} disabled={extracting}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold-50 border border-gold-200 rounded-lg text-xs font-medium text-gold-600 hover:bg-gold-100 transition-colors disabled:opacity-50">
                {extracting ? (
                  <span className="w-3 h-3 border-2 border-gold-300 border-t-gold-600 rounded-full animate-spin" />
                ) : (
                  <Pipette size={13} />
                )}
                {extracting ? 'Extraction...' : 'Extraire les couleurs du logo'}
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.svg,.webp"
          onChange={() => { const f = fileRef.current?.files?.[0]; if (f) handleUpload(f) }} />
      </div>

      {/* Extracted colors */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-2">
          <Palette size={14} className="inline mr-1" />Charte graphique
        </label>
        <div className="grid grid-cols-3 gap-3">
          <ColorField label="Couleur primaire" value={primaryColor} onChange={onPrimaryColor} disabled={disabled} />
          <ColorField label="Couleur secondaire" value={secondaryColor} onChange={onSecondaryColor} disabled={disabled} />
          <ColorField label="Couleur accent" value={accentColor} onChange={onAccentColor} disabled={disabled} />
        </div>
      </div>

      {/* Font */}
      <div>
        <label className="block text-[13px] font-medium text-gray-700 mb-1">
          <Type size={14} className="inline mr-1" />Police du client
        </label>
        <input
          type="text" value={brandFont ?? ''} onChange={(e) => onBrandFont(e.target.value || null)}
          placeholder="Ex : Helvetica, Arial, Montserrat..."
          disabled={disabled}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 disabled:bg-gray-50"
        />
      </div>

      {/* Preview */}
      {(logoUrl || primaryColor) && (
        <div>
          <label className="block text-[13px] font-medium text-gray-700 mb-2">Aper&ccedil;u en-t&ecirc;te rapport</label>
          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              {logoUrl && <img src={logoUrl} alt="" className="h-8 object-contain" />}
              <div className="flex-1" />
              {primaryColor && <div className="h-1 flex-1 rounded-full" style={{ background: primaryColor }} />}
              {secondaryColor && <div className="h-1 w-16 rounded-full" style={{ background: secondaryColor }} />}
              {accentColor && <div className="h-1 w-8 rounded-full" style={{ background: accentColor }} />}
            </div>
            <p className="mt-3 text-xs text-gray-300" style={{ fontFamily: brandFont ?? 'Inter' }}>
              Rapport d&rsquo;audit &mdash; Aper&ccedil;u de la personnalisation
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ColorField({ label, value, onChange, disabled }: {
  label: string; value: string | null; onChange: (v: string | null) => void; disabled: boolean
}): JSX.Element {
  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="color" value={value ?? '#cccccc'}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer disabled:cursor-default p-0"
        />
        <input
          type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}
          placeholder="#000000" disabled={disabled}
          className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs font-mono outline-none focus:border-forest-500 disabled:bg-gray-50"
        />
      </div>
    </div>
  )
}

/** Extract top 3 dominant colors from image pixel data */
function extractDominantColors(data: Uint8ClampedArray, width: number, height: number): string[] {
  const colorCounts = new Map<string, number>()
  const step = Math.max(1, Math.floor((width * height) / 5000)) // Sample ~5000 pixels

  for (let i = 0; i < data.length; i += step * 4) {
    const r = Math.round(data[i] / 32) * 32
    const g = Math.round(data[i + 1] / 32) * 32
    const b = Math.round(data[i + 2] / 32) * 32
    const a = data[i + 3]

    // Skip transparent and near-white/near-black
    if (a < 128) continue
    if (r > 240 && g > 240 && b > 240) continue
    if (r < 15 && g < 15 && b < 15) continue

    const key = `${r},${g},${b}`
    colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1)
  }

  const sorted = [...colorCounts.entries()].sort((a, b) => b[1] - a[1])
  return sorted.slice(0, 3).map(([key]) => {
    const [r, g, b] = key.split(',').map(Number)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  })
}
