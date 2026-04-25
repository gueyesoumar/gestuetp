import { supabase } from '../../lib/supabase'

/**
 * Triggers an asynchronous Anthropic Files API upload for the given document.
 * Calls the ai-documents Edge Function with action='upload' which downloads
 * the file from Supabase Storage and uploads it to Anthropic.
 *
 * - Runs in the background (fire-and-forget). Errors are logged but don't
 *   block the upload flow.
 * - Skips PDFs only (Files API doesn't support all formats).
 * - Once the upload succeeds, the document's `anthropic_file_id` column
 *   is populated, and subsequent AI analyses will use the Files API
 *   (faster, no token retransmission).
 */
export function registerDocumentForAI(documentId: string, fileName: string): void {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const supportedExts = ['pdf', 'txt', 'csv', 'html']
  if (!supportedExts.includes(ext)) {
    return // No-op for unsupported formats (e.g. images, docx)
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
