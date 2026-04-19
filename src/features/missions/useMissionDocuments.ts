import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Document } from '../../types/database.types'

interface UseMissionDocumentsResult {
  documents: Document[]
  loading: boolean
  error: string | null
  uploading: boolean
  uploadError: string | null
  uploadDocument: (file: File, description: string) => Promise<boolean>
  deleteDocument: (docId: string, filePath: string) => Promise<boolean>
  refetch: () => void
}

export function useMissionDocuments(missionId: string | undefined, controlId?: string): UseMissionDocumentsResult {
  const { profile } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)

    const query = supabase
      .from('documents')
      .select('*')
      .eq('mission_id', missionId)

    // Filter by control_id if provided (fieldwork), otherwise show ALL mission docs
    if (controlId) {
      query.eq('control_id', controlId)
    }

    query
      .order('created_at', { ascending: false })
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useMissionDocuments:', queryError.message)
          setError('Impossible de charger les documents.')
        } else {
          setDocuments(data ?? [])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [missionId, controlId, refreshKey])

  const uploadDocument = useCallback(async (file: File, description: string): Promise<boolean> => {
    if (!missionId || !profile) return false

    setUploading(true)
    setUploadError(null)

    // Sanitize filename: remove special chars, keep extension
    const safeName = file.name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-zA-Z0-9._-]/g, '_') // replace special chars with _
      .replace(/_+/g, '_') // collapse multiple _
    const filePath = `missions/${missionId}/${Date.now()}_${safeName}`

    // 1. Upload vers Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (storageError) {
      console.error('useMissionDocuments STORAGE error:', storageError.message, storageError)
      setUploadError(`Erreur Storage : ${storageError.message}`)
      setUploading(false)
      return false
    }

    // 2. Inserer dans la table documents
    const { error: insertError } = await supabase
      .from('documents')
      .insert({
        mission_id: missionId,
        control_id: controlId || null,
        uploaded_by: profile.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
        description: description || null,
      })

    if (insertError) {
      console.error('useMissionDocuments TABLE INSERT error:', insertError.message, insertError)
      setUploadError(`Fichier upload\u00e9 mais erreur table : ${insertError.message}`)
      setUploading(false)
      return false
    }

    setUploading(false)
    refetch()
    return true
  }, [missionId, profile, refetch])

  const deleteDocument = useCallback(async (docId: string, filePath: string): Promise<boolean> => {
    // 1. Delete from Storage
    const { error: storageErr } = await supabase.storage.from('documents').remove([filePath])
    if (storageErr) console.error('deleteDocument storage:', storageErr.message)

    // 2. Delete from table
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/documents?id=eq.${docId}`, {
      method: 'DELETE',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=minimal',
      },
    })

    if (!res.ok) {
      console.error('deleteDocument table:', await res.text())
      return false
    }

    refetch()
    return true
  }, [refetch])

  return { documents, loading, error, uploading, uploadError, uploadDocument, deleteDocument, refetch }
}
