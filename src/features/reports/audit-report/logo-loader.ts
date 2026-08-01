export interface LogoData { dataUrl: string; width: number; height: number; format: 'PNG' | 'JPEG' | 'WEBP' }

/**
 * Charge une image distante et la convertit en dataURL + dimensions.
 * Utilise FileReader + createImageBitmap : tous deux disponibles main thread
 * ET Web Worker, ce qui permet de migrer la generation en worker sans refactor.
 */
export async function loadImageAsDataURL(url: string): Promise<LogoData | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    const mime = blob.type.toLowerCase()
    let format: LogoData['format'] | null = null
    if (mime.includes('png')) format = 'PNG'
    else if (mime.includes('jpeg') || mime.includes('jpg')) format = 'JPEG'
    else if (mime.includes('webp')) format = 'WEBP'
    if (!format) return null
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(r.result as string)
      r.onerror = () => reject(new Error('FileReader error'))
      r.readAsDataURL(blob)
    })
    const bitmap = await createImageBitmap(blob)
    const dims = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return { dataUrl, format, width: dims.width, height: dims.height }
  } catch (err) {
    console.warn('[audit-pdf] logo load failed:', err)
    return null
  }
}
