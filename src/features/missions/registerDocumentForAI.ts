import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
import { ocrImage } from '../../lib/ocr'

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp'])

/**
 * Triggers an asynchronous Anthropic Files API upload for the given document.
 * Calls the ai-documents Edge Function with action='upload' which downloads
 * the file from Supabase Storage, convertit si nécessaire (DOCX/XLSX) puis
 * upload vers Anthropic.
 *
 * - Fire-and-forget : les erreurs sont loggées mais ne bloquent pas l'upload UI.
 * - La whitelist doit rester synchro avec uploadValidation.ts ACCEPTED_FORMATS
 *   et avec la branche prepareAsset() de la edge function ai-documents.
 */
export function registerDocumentForAI(documentId: string, fileName: string, onDone?: () => void, file?: File): void {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const supportedExts = [
    'pdf', 'txt', 'csv', 'html', 'htm', 'md',
    'docx', 'doc',
    'xlsx', 'xls',
    'png', 'jpg', 'jpeg', 'webp',
  ]
  if (!supportedExts.includes(ext)) {
    return
  }

  // Fire-and-forget — don't await. `onDone` est appelé quand l'edge a répondu
  // (la sensibilité est alors persistée) pour rafraîchir la liste et afficher la pastille.
  void (async () => {
    try {
      // P3a : OCR navigateur des images AVANT envoi — l'edge inspecte ce texte (il ne
      // sait pas lire une image). Les PDF sont extraits côté edge (P2c).
      let ocrText: string | undefined
      if (file && IMAGE_EXTS.has(ext)) {
        const text = await ocrImage(file)
        if (text) ocrText = text
      }

      const { data, error } = await supabase.functions.invoke('ai-documents', {
        body: { action: 'upload', document_id: documentId, ...(ocrText ? { ocr_text: ocrText } : {}) },
      })

      if (error) {
        const detail = await readInvokeError(error, data, 'Upload IA impossible')
        console.warn(`[registerDocumentForAI] Upload failed for ${fileName}:`, detail)
        return
      }

      if (data?.error) {
        console.warn(`[registerDocumentForAI] Anthropic error for ${fileName}:`, data.error)
        return
      }

      console.log(`[registerDocumentForAI] ${fileName} scanned (sensitivity persisted), AI upload en tâche de fond`)
    } catch (err) {
      console.warn(`[registerDocumentForAI] Unexpected error for ${fileName}:`, err)
    } finally {
      onDone?.()
    }
  })()
}
