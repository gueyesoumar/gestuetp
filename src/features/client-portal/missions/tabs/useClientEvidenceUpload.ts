import { useRef, useState, useCallback } from 'react'
import { useAuth } from '../../../../hooks/useAuth'
import { useToast } from '../../../../hooks/useToast'
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag'
import { supabase } from '../../../../lib/supabase'
import { registerDocumentForAI } from '../../../missions/registerDocumentForAI'
import { validateFiles } from '../../../missions/uploadValidation'
import type { Document } from '../../../../types/database.types'

interface UseClientEvidenceUploadArgs {
  missionId: string
  documents: Document[]
  refetchDocs: () => void
  refetchExpected: () => void
}

export interface ClientEvidenceUploadApi {
  fileInputRef: React.RefObject<HTMLInputElement>
  pendingDocName: string | null
  linkingDocName: string | null
  setLinkingDocName: (name: string | null) => void
  availableForLinking: Document[]
  triggerFileInput: (docName: string | null, controlIds?: string[], evidenceRequestIds?: string[]) => void
  handleFileSelected: () => Promise<void>
  handleDrop: (e: React.DragEvent) => Promise<void>
  linkExistingDoc: (
    existingDoc: { file_name: string; file_path: string; file_size: number | null; mime_type: string | null },
    evidenceName: string,
    controlIds?: string[],
  ) => Promise<void>
}

/**
 * Logique d'upload / liaison de documents (preuves) côté portail client.
 * Extraite de ClientExchangesTab pour respecter la règle 150 lignes (CLAUDE.md §2).
 * Comportement strictement identique : mêmes payloads, mêmes gardes res.ok.
 */
export function useClientEvidenceUpload({
  missionId, documents, refetchDocs, refetchExpected,
}: UseClientEvidenceUploadArgs): ClientEvidenceUploadApi {
  const { profile } = useAuth()
  const toast = useToast()
  const filesApiFlag = useFeatureFlag('documents_anthropic_files')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingDocName, setPendingDocName] = useState<string | null>(null)
  const [pendingControlIds, setPendingControlIds] = useState<string[]>([])
  const [pendingEvidenceRequestIds, setPendingEvidenceRequestIds] = useState<string[]>([])
  const [linkingDocName, setLinkingDocName] = useState<string | null>(null)

  const triggerFileInput = useCallback((docName: string | null, controlIds?: string[], evidenceRequestIds?: string[]): void => {
    setPendingDocName(docName)
    setPendingControlIds(controlIds ?? [])
    setPendingEvidenceRequestIds(evidenceRequestIds ?? [])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }, [])

  const uploadOne = useCallback(async (file: File, evidenceName: string | null, controlIds: string[], evidenceRequestIds: string[]): Promise<void> => {
    if (!profile) return

    const description = evidenceName ? `[EVIDENCE:${evidenceName}]` : ''
    const evidenceLabel = evidenceName ?? file.name

    const safeName = file.name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
    const filePath = `missions/${missionId}/${Date.now()}_${safeName}`
    const controlId = controlIds.length > 0 ? controlIds[0] : null
    // Mapping fort doc → demande de preuve : indispensable pour que la Passe 2
    // de l'IA priorise ce doc sur la question correspondante (vs un doc
    // généraliste comme la PSSI). On prend la 1re demande de preuve si plusieurs.
    const evidenceRequestId = evidenceRequestIds.length > 0 ? evidenceRequestIds[0] : null

    const upload = async (): Promise<string> => {
      const { error: storageError } = await supabase.storage.from('documents').upload(filePath, file)
      if (storageError) {
        console.error('ClientExchangesTab storage:', storageError.message)
        throw new Error(storageError.message)
      }

      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('Session expirée')

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          mission_id: missionId,
          control_id: controlId,
          evidence_request_id: evidenceRequestId,
          uploaded_by: profile.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type || null,
          description,
        }),
      })

      if (!res.ok) {
        const detail = await res.text()
        console.error('ClientExchangesTab insert:', detail)
        throw new Error('insert failed')
      }

      try {
        const inserted = await res.json() as { id: string }[]
        const docId = inserted?.[0]?.id
        if (docId && filesApiFlag.enabled) registerDocumentForAI(docId, file.name)
      } catch { /* upload succeeded; AI registration is fire-and-forget */ }

      return evidenceLabel
    }

    const promise = upload()
    toast.promise(promise, {
      loading: `Envoi de ${file.name}…`,
      success: (label) => `« ${label} » déposé`,
      error: 'Impossible d\'envoyer le document',
    })

    try { await promise } catch { /* toast already informed the user */ }
  }, [missionId, profile, filesApiFlag.enabled, toast])

  const processSelectedFiles = useCallback(async (files: FileList | File[], evidenceName: string | null, controlIds: string[], evidenceRequestIds: string[]): Promise<void> => {
    const { ok, failures } = validateFiles(files)
    for (const f of failures) {
      toast.error(`${f.fileName} : ${f.reason}`)
    }
    if (ok.length === 0) return
    for (const file of ok) {
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(file, evidenceName, controlIds, evidenceRequestIds)
    }
    refetchDocs()
    setTimeout(() => refetchExpected(), 500)
  }, [uploadOne, refetchDocs, refetchExpected, toast])

  const handleFileSelected = useCallback(async (): Promise<void> => {
    const files = fileInputRef.current?.files
    if (!files || files.length === 0) return
    await processSelectedFiles(files, pendingDocName, pendingControlIds, pendingEvidenceRequestIds)
    setPendingDocName(null)
    setPendingControlIds([])
    setPendingEvidenceRequestIds([])
  }, [processSelectedFiles, pendingDocName, pendingControlIds, pendingEvidenceRequestIds])

  const handleDrop = useCallback(async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return
    await processSelectedFiles(files, null, [], [])
  }, [processSelectedFiles])

  const linkExistingDoc = useCallback(async (existingDoc: { file_name: string; file_path: string; file_size: number | null; mime_type: string | null }, evidenceName: string, controlIds?: string[]): Promise<void> => {
    if (!profile) return

    const controlId = controlIds && controlIds.length > 0 ? controlIds[0] : null

    const link = async (): Promise<string> => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('Session expirée')

      const linkRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          mission_id: missionId,
          control_id: controlId,
          uploaded_by: profile.id,
          file_name: existingDoc.file_name,
          file_path: existingDoc.file_path,
          file_size: existingDoc.file_size,
          mime_type: existingDoc.mime_type,
          description: `[EVIDENCE:${evidenceName}]`,
        }),
      })

      if (!linkRes.ok) {
        const detail = await linkRes.text()
        console.error('ClientExchangesTab link:', detail)
        throw new Error('link failed')
      }

      try {
        const inserted = await linkRes.json() as { id: string }[]
        const docId = inserted?.[0]?.id
        if (docId && filesApiFlag.enabled) registerDocumentForAI(docId, existingDoc.file_name)
      } catch { /* ignore */ }

      return existingDoc.file_name
    }

    const promise = link()
    toast.promise(promise, {
      loading: 'Liaison du document…',
      success: (name) => `« ${name} » lié à « ${evidenceName} »`,
      error: 'Impossible de lier le document',
    })

    try {
      await promise
      refetchDocs()
      setTimeout(() => refetchExpected(), 500)
    } catch {
      // toast already informed the user
    } finally {
      setLinkingDocName(null)
    }
  }, [missionId, profile, filesApiFlag.enabled, refetchDocs, refetchExpected, toast])

  // Documents disponibles pour liaison (déjà uploadés, pas encore liés à la preuve courante)
  const availableForLinking = documents.filter((d) => {
    if (!linkingDocName) return false
    return !d.description?.includes(`[EVIDENCE:${linkingDocName}]`)
  })

  return {
    fileInputRef,
    pendingDocName,
    linkingDocName,
    setLinkingDocName,
    availableForLinking,
    triggerFileInput,
    handleFileSelected,
    handleDrop,
    linkExistingDoc,
  }
}
