import { supabase } from '../../lib/supabase'

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
export function registerDocumentForAI(documentId: string, fileName: string): void {
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

  // Fire-and-forget — don't await
  void (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ai-documents', {
        body: { action: 'upload', document_id: documentId },
      })

      if (error) {
        console.warn(`[registerDocumentForAI] Upload failed for ${fileName}:`, error.message)
        return
      }

      if (data?.error) {
        console.warn(`[registerDocumentForAI] Anthropic error for ${fileName}:`, data.error)
        return
      }

      console.log(`[registerDocumentForAI] ${fileName} registered with Anthropic Files API:`, data?.file_id)
    } catch (err) {
      console.warn(`[registerDocumentForAI] Unexpected error for ${fileName}:`, err)
    }
  })()
}
