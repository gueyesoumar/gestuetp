// OCR navigateur (tesseract.js, WASM) — extrait le texte d'une image AVANT de laisser
// l'edge décider de l'envoi au modèle. L'edge reste l'autorité (il re-score le texte OCR).
//
// Assets AUTO-HÉBERGÉS (public/tesseract/) → tout en same-origin : la CSP existante suffit
// (connect-src 'self', worker-src 'self' blob'). Aucun appel CDN. Chargement paresseux
// (import dynamique) : tesseract n'alourdit pas le bundle principal.

// deno-lint-ignore-file
type TesseractWorker = { recognize: (img: Blob | File) => Promise<{ data: { text?: string } }> }

let workerPromise: Promise<TesseractWorker> | null = null

async function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js')
      // 'fra' : documents d'audit en français. OEM 1 = LSTM.
      return await createWorker('fra', 1, {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract/',
        langPath: '/tesseract/',
      }) as unknown as TesseractWorker
    })()
  }
  return workerPromise
}

/**
 * Extrait le texte d'une image. Renvoie '' en cas d'échec (OCR raté, format non géré) :
 * l'edge retombe alors sur « non inspecté » — aucune régression.
 */
export async function ocrImage(file: File | Blob): Promise<string> {
  try {
    const worker = await getWorker()
    const { data } = await worker.recognize(file)
    return (data.text ?? '').trim()
  } catch (err) {
    console.warn('[ocr] échec extraction image:', err instanceof Error ? err.message : 'unknown')
    return ''
  }
}
