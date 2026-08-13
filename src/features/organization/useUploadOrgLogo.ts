import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface UploadResult {
  ok: boolean
  url?: string
  error?: string
}

/**
 * Téléverse le logo d'identité de l'organisation via l'Edge Function
 * upload-org-logo (multipart). La fonction cible toujours l'org de l'appelant.
 */
export function useUploadOrgLogo(): { upload: (file: File) => Promise<UploadResult>; uploading: boolean } {
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File): Promise<UploadResult> => {
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const form = new FormData()
      form.append('file', file)
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-org-logo`
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: form,
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: payload.error ?? 'Upload impossible' }
      return { ok: true, url: payload.url }
    } catch {
      return { ok: false, error: 'Upload impossible' }
    } finally {
      setUploading(false)
    }
  }

  return { upload, uploading }
}
