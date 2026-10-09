import { useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface UploadedFile { document_id: string; file_name: string; file_path: string }

const MAX_BYTES = 25 * 1024 * 1024

/**
 * Téléversement RÉEL d'une pièce jointe de cadrage : envoie le fichier dans le
 * bucket Storage `documents` et crée une ligne `documents` (mission-scopée, taguée
 * [CADRAGE:<code>]) — réutilise le pipeline existant (policies client déjà en place).
 * Le fichier devient une vraie preuve de mission, téléchargeable par l'auditeur.
 */
export function useQuestionnaireFileUpload(missionId: string) {
  const { profile } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File, questionCode: string): Promise<UploadedFile | null> => {
    if (!missionId || !profile) { setError('Session invalide. Reconnectez-vous.'); return null }
    if (file.size > MAX_BYTES) { setError('Fichier trop volumineux (max 25 Mo).'); return null }
    setUploading(true); setError(null)
    try {
      const safeName = file.name
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
      const filePath = `missions/${missionId}/cadrage_${Date.now()}_${safeName}`

      const { error: upErr } = await supabase.storage.from('documents').upload(filePath, file)
      if (upErr) throw new Error(upErr.message)

      const { data: doc, error: insErr } = await supabase.from('documents').insert({
        mission_id: missionId,
        uploaded_by: profile.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
        description: `[CADRAGE:${questionCode}]`,
      }).select('id').single()
      if (insErr) throw new Error(insErr.message)

      return { document_id: doc.id as string, file_name: file.name, file_path: filePath }
    } catch (e) {
      console.error('[cadrage-upload]', e instanceof Error ? e.message : e)
      setError('Téléversement impossible. Réessayez.')
      return null
    } finally {
      setUploading(false)
    }
  }, [missionId, profile])

  const getSignedUrl = useCallback(async (path: string): Promise<string | null> => {
    const { data } = await supabase.storage.from('documents').createSignedUrl(path, 3600)
    return data?.signedUrl ?? null
  }, [])

  return { upload, uploading, error, getSignedUrl }
}
