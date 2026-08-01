export interface LogoData {
  dataUrl: string
  width: number
  height: number
  format: 'PNG' | 'JPEG' | 'WEBP'
}

// Charge une image distante et la convertit en data URL pour insertion
// jsPDF. Retourne null si l'image n'est pas accessible (CORS, 404) ou
// d'un format non supporté (SVG, etc.). Best effort, ne lève jamais.
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
    if (!format) return null // jsPDF ne supporte pas SVG/GIF nativement

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('FileReader error'))
      reader.readAsDataURL(blob)
    })

    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('Image decode error'))
      img.src = dataUrl
    })

    return { dataUrl, format, width: dims.width, height: dims.height }
  } catch (err) {
    console.warn('[scoping-pdf] logo load failed:', err)
    return null
  }
}
