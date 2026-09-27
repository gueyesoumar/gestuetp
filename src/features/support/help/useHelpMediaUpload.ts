import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

/**
 * Téléversement de médias (image ou vidéo) vers le bucket public help-media, réservé au
 * platform owner (RLS). Garde de taille et messages génériques (détail en console).
 * Réutilisé par l'éditeur d'article pour les images inline et la vidéo de démo.
 */
const MAX: Record<'image' | 'video', number> = {
  image: 10 * 1024 * 1024, // 10 Mo
  video: 100 * 1024 * 1024, // 100 Mo
}

interface UseHelpMediaUpload {
  upload: (file: File, kind: 'image' | 'video') => Promise<string | null>
  uploading: boolean
  error: string | null
  setError: (v: string | null) => void
}

export function useHelpMediaUpload(): UseHelpMediaUpload {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File, kind: 'image' | 'video'): Promise<string | null> => {
    setError(null)
    if (file.size > MAX[kind]) {
      setError(`Fichier trop volumineux (max ${Math.round(MAX[kind] / 1024 / 1024)} Mo).`)
      return null
    }
    setUploading(true)
    const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `articles/${Date.now()}_${safe}`
    const { error: e } = await supabase.storage.from('help-media').upload(path, file)
    if (e) {
      console.error('help media upload:', e.message)
      setError('Téléversement impossible.')
      setUploading(false)
      return null
    }
    const { data } = supabase.storage.from('help-media').getPublicUrl(path)
    setUploading(false)
    return data?.publicUrl ?? null
  }, [])

  return { upload, uploading, error, setError }
}
