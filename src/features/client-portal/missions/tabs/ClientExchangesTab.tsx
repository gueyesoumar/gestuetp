import { useRef, useState, useCallback } from 'react'
import { Paperclip, Check, Sparkles, FileText, BarChart3, Calendar, BookOpen, Link2, ArrowRight, XCircle, AlertCircle, RotateCw } from 'lucide-react'
import { useAuth } from '../../../../hooks/useAuth'
import { useToast } from '../../../../hooks/useToast'
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag'
import { supabase } from '../../../../lib/supabase'
import { useMissionQuestionnaire } from '../../../missions/useMissionQuestionnaire'
import { useMissionDocuments } from '../../../missions/useMissionDocuments'
import { registerDocumentForAI } from '../../../missions/registerDocumentForAI'
import { useClientExpectedDocuments } from '../../smart-interview/useClientExpectedDocuments'
import { useDeclineEvidence } from '../../smart-interview/useDeclineEvidence'
import { DeclineEvidenceModal } from '../../smart-interview/DeclineEvidenceModal'
import { useClientInterviews } from './useClientInterviews'
import { SmartInterviewContainer } from '../../smart-interview/SmartInterviewContainer'
import { validateFiles, ACCEPT_ATTR, formatList, MAX_FILE_SIZE_LABEL } from '../../../missions/uploadValidation'
import type { ClientMissionDetail } from '../useClientMissionDetail'
import type { ExpectedDocument } from '../../smart-interview/useClientExpectedDocuments'
import type { EvidenceDeclineReason } from '../../../../types/database.types'

interface Props {
  mission: ClientMissionDetail
  canContribute: boolean
  onRefetch: () => void
}

export function ClientExchangesTab({ mission, canContribute }: Props): JSX.Element {
  const { profile } = useAuth()
  const toast = useToast()
  const filesApiFlag = useFeatureFlag('documents_anthropic_files')
  const smartInterviewFlag = useFeatureFlag('smart_interview_portal')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingDocName, setPendingDocName] = useState<string | null>(null)
  const [pendingControlIds, setPendingControlIds] = useState<string[]>([])
  const [pendingEvidenceRequestIds, setPendingEvidenceRequestIds] = useState<string[]>([])
  const [linkingDocName, setLinkingDocName] = useState<string | null>(null)
  const [decliningDoc, setDecliningDoc] = useState<ExpectedDocument | null>(null)
  const [declineError, setDeclineError] = useState<string | null>(null)

  const { instance, questions, responses, loading: qLoading } = useMissionQuestionnaire(mission.id)
  const { documents, uploading, refetch: refetchDocs } = useMissionDocuments(mission.id)
  const { expectedDocs, pendingCount, uploadedCount, declinedCount, coveredControls, totalControls, loading: edLoading, refetch: refetchExpected } = useClientExpectedDocuments(mission.id)
  const { declineDocument, cancelDeclaration, submitting: declineSubmitting } = useDeclineEvidence(refetchExpected)
  const { interviews, loading: intLoading } = useClientInterviews(mission.id)

  const handleDecline = useCallback(async (reason: EvidenceDeclineReason, justification: string): Promise<void> => {
    if (!decliningDoc) return
    setDeclineError(null)
    const result = await declineDocument({
      evidenceRequestIds: decliningDoc.evidenceRequestIds,
      reason,
      justification,
    })
    if (!result.ok) {
      setDeclineError(result.error ?? 'Erreur')
      return
    }
    toast.success(`Déclaration enregistrée pour « ${decliningDoc.name} »`)
    setDecliningDoc(null)
  }, [decliningDoc, declineDocument, toast])

  const handleCancelDecline = useCallback(async (doc: ExpectedDocument): Promise<void> => {
    const result = await cancelDeclaration(doc.evidenceRequestIds)
    if (!result.ok) {
      toast.error(result.error ?? 'Annulation impossible')
      return
    }
    toast.success(`Déclaration annulée pour « ${doc.name} »`)
  }, [cancelDeclaration, toast])

  const initialResponses = new Map<string, unknown>()
  for (const r of responses) {
    const val = r.response
    if (val && typeof val === 'object' && 'value' in val) {
      initialResponses.set(r.question_code, (val as { value: unknown }).value)
    }
  }

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
    const filePath = `missions/${mission.id}/${Date.now()}_${safeName}`
    const controlId = controlIds.length > 0 ? controlIds[0] : null
    // Mapping fort doc \u2192 demande de preuve : indispensable pour que la Passe 2
    // de l'IA priorise ce doc sur la question correspondante (vs un doc
    // g\u00e9n\u00e9raliste comme la PSSI). On prend la 1re demande de preuve si plusieurs.
    const evidenceRequestId = evidenceRequestIds.length > 0 ? evidenceRequestIds[0] : null

    const upload = async (): Promise<string> => {
      const { error: storageError } = await supabase.storage.from('documents').upload(filePath, file)
      if (storageError) {
        console.error('ClientExchangesTab storage:', storageError.message)
        throw new Error(storageError.message)
      }

      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('Session expir\u00e9e')

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          mission_id: mission.id,
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
      loading: `Envoi de ${file.name}\u2026`,
      success: (label) => `\u00ab ${label} \u00bb d\u00e9pos\u00e9`,
      error: 'Impossible d\'envoyer le document',
    })

    try { await promise } catch { /* toast already informed the user */ }
  }, [mission.id, profile, filesApiFlag.enabled, toast])

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
      if (!token) throw new Error('Session expir\u00e9e')

      const linkRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          mission_id: mission.id,
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
      loading: 'Liaison du document\u2026',
      success: (name) => `\u00ab ${name} \u00bb li\u00e9 \u00e0 \u00ab ${evidenceName} \u00bb`,
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
  }, [mission.id, profile, refetchDocs, refetchExpected, toast])

  // Documents available for linking (already uploaded, not yet linked to the current evidence)
  const availableForLinking = documents.filter((d) => {
    if (!linkingDocName) return false
    return !d.description?.includes(`[EVIDENCE:${linkingDocName}]`)
  })

  return (
    <div className="space-y-8">
      {/* Single hidden file input */}
      <input ref={fileInputRef} type="file" multiple className="hidden"
        accept={ACCEPT_ATTR}
        onChange={handleFileSelected} />

      {/* ═══ SECTION: Documents ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Paperclip size={15} className="text-forest-700" />
          <h3 className="text-sm font-bold">Documents</h3>
          {pendingCount > 0 && <span className="text-[10px] font-medium text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full">{pendingCount} en attente</span>}
          {uploadedCount > 0 && <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{uploadedCount} d&eacute;pos&eacute;{uploadedCount > 1 ? 's' : ''}</span>}
          {declinedCount > 0 && <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{declinedCount} d&eacute;clar&eacute;{declinedCount > 1 ? 's' : ''} ND</span>}
        </div>

        {/* Upload zone */}
        {canContribute && (
          <div
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors mb-3 ${uploading ? 'border-gray-300 bg-gray-50' : 'border-forest-300 bg-forest-50 hover:border-forest-500'}`}
            onClick={() => triggerFileInput(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {uploading && !pendingDocName ? (
              <div className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-forest-300 border-t-forest-700 rounded-full animate-spin" />
                <span className="text-xs text-forest-700 font-medium">Upload en cours...</span>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold text-forest-900">Glissez vos fichiers ici ou <span className="text-forest-700 underline">parcourez</span></p>
                <p className="text-[10px] text-gray-400 mt-1">{formatList()} &mdash; {MAX_FILE_SIZE_LABEL} max par fichier &middot; multi-s&eacute;lection support&eacute;e</p>
              </>
            )}
          </div>
        )}

        {/* AI banner */}
        {documents.length > 0 && (
          <div className="flex items-center gap-2 p-2.5 bg-gold-50 border border-gold-200 rounded-lg mb-3">
            <Sparkles size={13} className="text-gold-500" />
            <p className="text-[10px] text-gold-600 flex-1"><b>Analyse IA active</b> &mdash; Les documents d&eacute;pos&eacute;s pr&eacute;-remplissent automatiquement votre questionnaire.</p>
          </div>
        )}

        {/* Expected documents */}
        {edLoading ? (
          <p className="text-xs text-gray-400 text-center py-4">Chargement...</p>
        ) : expectedDocs.length > 0 ? (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Documents attendus par les auditeurs</p>
            <p className="text-[10px] text-gray-300 mb-3">G&eacute;n&eacute;r&eacute;s depuis les contr&ocirc;les de cette mission.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              {expectedDocs.map((doc) => (
                <div key={doc.id} className="flex flex-col">
                  <div className={`flex items-start gap-2.5 p-3 border rounded-lg transition-colors ${
                    doc.status === 'uploaded' ? 'bg-forest-50 border-forest-200'
                      : doc.status === 'declined_by_client' ? 'bg-amber-50/40 border-amber-200'
                      : doc.status === 'accepted' ? 'bg-blue-50/40 border-blue-200'
                      : doc.status === 'escalated_to_finding' ? 'bg-red-50/40 border-red-200'
                      : doc.status === 'reissued' ? 'bg-gold-50/40 border-gold-300'
                      : 'bg-white border-gray-200 hover:border-forest-300'
                  }`}>
                    <span className="mt-0.5">
                      {doc.status === 'uploaded' && <FileText size={16} className="text-forest-700" />}
                      {(doc.status === 'pending' || doc.status === 'reissued') && <BookOpen size={16} className="text-gold-500" />}
                      {doc.status === 'declined_by_client' && <XCircle size={16} className="text-amber-700" />}
                      {doc.status === 'accepted' && <Check size={16} className="text-blue-600" />}
                      {doc.status === 'escalated_to_finding' && <AlertCircle size={16} className="text-red-600" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">{doc.name}</p>
                      {doc.description && <p className="text-[10px] text-gray-400 mt-0.5">{doc.description}</p>}
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {doc.controlCodes.slice(0, 4).map((code) => (
                          <span key={code} className="font-mono text-[8px] font-semibold bg-forest-50 text-forest-700 px-1.5 py-0.5 rounded">{code}</span>
                        ))}
                        {doc.controlCodes.length > 4 && <span className="text-[8px] text-gray-300">+{doc.controlCodes.length - 4}</span>}
                      </div>
                      {doc.uploadedFileName && (
                        <p className="text-[10px] text-green-600 font-medium mt-1.5 flex items-center gap-0.5"><Check size={10} /> {doc.uploadedFileName}</p>
                      )}
                      {doc.status === 'declined_by_client' && (
                        <div className="mt-1.5 text-[10px]">
                          <span className="font-semibold text-amber-700">D&eacute;clar&eacute; non disponible</span>
                          {doc.declineReason === 'inexistant' && <span className="text-amber-700"> &middot; inexistant</span>}
                          {doc.declineReason === 'non_applicable' && <span className="text-amber-700"> &middot; non applicable</span>}
                          {doc.declineReason === 'confidentialite' && <span className="text-amber-700"> &middot; confidentialit&eacute;</span>}
                          <span className="text-gray-400"> &middot; en attente de l&rsquo;auditeur</span>
                        </div>
                      )}
                      {doc.status === 'accepted' && (
                        <p className="text-[10px] text-blue-700 font-medium mt-1.5 flex items-center gap-1">
                          <Check size={10} /> D&eacute;claration accept&eacute;e par l&rsquo;auditeur
                        </p>
                      )}
                      {doc.status === 'escalated_to_finding' && (
                        <p className="text-[10px] text-red-700 font-medium mt-1.5 flex items-center gap-1">
                          <AlertCircle size={10} /> Transform&eacute; en constat par l&rsquo;auditeur
                        </p>
                      )}
                      {doc.status === 'reissued' && doc.auditorResponse && (
                        <p className="text-[10px] text-gold-700 mt-1.5">
                          <span className="font-semibold">L&rsquo;auditeur insiste&nbsp;:</span> {doc.auditorResponse}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 mt-0.5 flex flex-col gap-1 w-[120px]">
                      {doc.status === 'uploaded' ? (
                        <div className="self-end w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check size={13} className="text-white" />
                        </div>
                      ) : doc.status === 'declined_by_client' && canContribute ? (
                        <button
                          onClick={() => handleCancelDecline(doc)}
                          disabled={declineSubmitting}
                          className="w-full px-2.5 py-1.5 border border-amber-300 rounded-md text-[10.5px] font-medium text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 leading-none"
                          title="Annuler la déclaration et revenir à 'en attente'"
                        >
                          <RotateCw size={11} /> Annuler
                        </button>
                      ) : doc.status === 'accepted' ? (
                        <div className="self-end w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center" title="Acceptée par l'auditeur">
                          <Check size={13} className="text-white" />
                        </div>
                      ) : doc.status === 'escalated_to_finding' ? (
                        <div className="self-end w-6 h-6 rounded-full bg-red-500 flex items-center justify-center" title="Transformé en constat">
                          <AlertCircle size={13} className="text-white" />
                        </div>
                      ) : canContribute ? (
                        <>
                          <button
                            onClick={() => triggerFileInput(doc.name, doc.controlIds, doc.evidenceRequestIds)}
                            disabled={uploading}
                            className="w-full px-2.5 py-1.5 border border-forest-300 rounded-md text-[10.5px] font-semibold text-forest-700 bg-forest-50 hover:bg-forest-100 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 leading-none"
                          >
                            {uploading && pendingDocName === doc.name ? (
                              <span className="w-3 h-3 border-2 border-forest-300 border-t-forest-700 rounded-full animate-spin inline-block" />
                            ) : (
                              <><Paperclip size={11} /> Déposer</>
                            )}
                          </button>
                          {documents.length > 0 && (
                            <button
                              onClick={() => setLinkingDocName(linkingDocName === doc.name ? null : doc.name)}
                              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[10.5px] font-medium text-gray-600 hover:text-forest-700 hover:border-forest-300 hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-1.5 leading-none"
                            >
                              <Link2 size={11} /> Lier
                            </button>
                          )}
                          {doc.evidenceRequestIds.length > 0 && (
                            <button
                              onClick={() => { setDeclineError(null); setDecliningDoc(doc) }}
                              disabled={declineSubmitting}
                              className="w-full px-2.5 py-1.5 border border-amber-200 rounded-md text-[10.5px] font-medium text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 leading-none"
                              title="Je n'ai pas ce document"
                            >
                              <XCircle size={11} /> Indisponible
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="self-end w-6 h-6 rounded-full border-2 border-gold-500" />
                      )}
                    </div>
                  </div>
                  {/* Linking dropdown */}
                  {linkingDocName === doc.name && availableForLinking.length > 0 && (
                    <div className="mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-[10px] font-semibold text-gray-500 mb-2">S&eacute;lectionner un document existant :</p>
                      <div className="space-y-1">
                        {availableForLinking.map((d) => (
                          <button key={d.id}
                            onClick={() => linkExistingDoc({ file_name: d.file_name, file_path: d.file_path, file_size: d.file_size, mime_type: d.mime_type }, doc.name, doc.controlIds)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-forest-50 transition-colors"
                          >
                            <FileText size={13} />
                            <span className="text-[11px] text-gray-700 truncate flex-1">{d.file_name}</span>
                            <span className="text-[9px] text-forest-700 font-medium shrink-0 inline-flex items-center gap-0.5">Lier <ArrowRight size={9} /></span>
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setLinkingDocName(null)} className="mt-2 text-[9px] text-gray-400 hover:text-gray-600">Annuler</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-forest-50 border border-forest-100 rounded-lg">
              <BarChart3 size={13} className="text-forest-700" />
              <p className="text-[10px] text-forest-700">
                <b>{expectedDocs.length} documents</b> couvrent <b>{coveredControls}/{totalControls} contr&ocirc;les</b>.
                {pendingCount > 0 && ` D\u00e9posez les ${pendingCount} restants pour optimiser l\u2019analyse IA.`}
              </p>
            </div>
          </>
        ) : documents.length > 0 ? (
          <div className="space-y-1.5">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-forest-50 border border-forest-200">
                <FileText size={15} className="text-forest-700" />
                <p className="text-xs font-medium text-gray-900 truncate flex-1">{doc.file_name}</p>
                <span className="text-[10px] text-green-600 font-medium inline-flex items-center gap-0.5"><Check size={10} /> D&eacute;pos&eacute;</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-400">Aucun document demand&eacute; pour cette mission.</p>
          </div>
        )}
      </section>

      {/* ═══ SECTION: Questionnaire ═══ */}
      {!smartInterviewFlag.loading && smartInterviewFlag.enabled && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-gold-500" />
            <h3 className="text-sm font-bold">Questionnaire intelligent</h3>
          </div>
          {qLoading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center"><p className="text-xs text-gray-400">Chargement...</p></div>
          ) : instance && questions.length > 0 ? (
            <SmartInterviewContainer missionId={mission.id} missionName={mission.name} questions={questions} instanceId={instance.id} userId={profile?.id ?? null} initialResponses={initialResponses} readOnly={!canContribute} documentsCount={documents.length} />
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center"><p className="text-xs text-gray-400">Aucun questionnaire pour cette mission.</p></div>
          )}
        </section>
      )}

      {/* ═══ SECTION: Entretiens ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={15} className="text-forest-700" />
          <h3 className="text-sm font-bold">Entretiens</h3>
          {interviews.length > 0 && <span className="text-[10px] font-medium text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full">{interviews.length}</span>}
        </div>
        {intLoading ? (
          <p className="text-xs text-gray-400 text-center py-4">Chargement...</p>
        ) : interviews.length > 0 ? (
          <div className="space-y-2">
            {interviews.map((iv) => (
              <div key={iv.id} className={`border rounded-lg overflow-hidden ${iv.status === 'scheduled' ? 'border-gold-200 bg-gold-50' : iv.status === 'completed' ? 'border-gray-200 bg-white opacity-60' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <Calendar size={15} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{iv.title}</p>
                    <p className="text-[10px] text-gray-400">{iv.date_label} &middot; {iv.auditor_name}</p>
                  </div>
                  {iv.status === 'scheduled' && <span className="text-[10px] font-medium text-gold-600 bg-gold-100 px-2 py-0.5 rounded-full">Planifi&eacute;</span>}
                  {iv.status === 'confirmed' && <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5"><Check size={10} /> Confirm&eacute;</span>}
                  {iv.status === 'completed' && <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Termin&eacute;</span>}
                </div>
                {iv.controlCodes.length > 0 && (
                  <div className="px-3 pb-2 flex gap-1 flex-wrap">
                    {iv.controlCodes.map((c) => (
                      <span key={c} className="font-mono text-[8px] font-semibold bg-forest-50 text-forest-700 px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <p className="text-xs text-gray-400">Les entretiens planifi&eacute;s appara&icirc;tront ici.</p>
          </div>
        )}
      </section>

      {/* Decline modal */}
      {decliningDoc && (
        <DeclineEvidenceModal
          documentName={decliningDoc.name}
          evidenceRequestIds={decliningDoc.evidenceRequestIds}
          submitting={declineSubmitting}
          error={declineError}
          onClose={() => { setDecliningDoc(null); setDeclineError(null) }}
          onConfirm={handleDecline}
        />
      )}
    </div>
  )
}
