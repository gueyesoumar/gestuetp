import { useRef, useState, useCallback } from 'react'
import { Paperclip, Check, Sparkles, FileText, BarChart3, Calendar, BookOpen, Link2, ArrowRight } from 'lucide-react'
import { useAuth } from '../../../../hooks/useAuth'
import { supabase } from '../../../../lib/supabase'
import { useMissionQuestionnaire } from '../../../missions/useMissionQuestionnaire'
import { useMissionDocuments } from '../../../missions/useMissionDocuments'
import { registerDocumentForAI } from '../../../missions/registerDocumentForAI'
import { useClientExpectedDocuments } from '../../smart-interview/useClientExpectedDocuments'
import { useClientInterviews } from './useClientInterviews'
import { SmartInterviewContainer } from '../../smart-interview/SmartInterviewContainer'
import type { ClientMissionDetail } from '../useClientMissionDetail'

interface Props {
  mission: ClientMissionDetail
  isContributor: boolean
  onRefetch: () => void
}

export function ClientExchangesTab({ mission, isContributor }: Props): JSX.Element {
  const { profile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingDocName, setPendingDocName] = useState<string | null>(null)
  const [pendingControlIds, setPendingControlIds] = useState<string[]>([])
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [localUploadError, setLocalUploadError] = useState<string | null>(null)
  const [linkingDocName, setLinkingDocName] = useState<string | null>(null)

  const { instance, questions, responses, loading: qLoading } = useMissionQuestionnaire(mission.id)
  const { documents, uploading, uploadError, uploadDocument, refetch: refetchDocs } = useMissionDocuments(mission.id)
  const { expectedDocs, pendingCount, uploadedCount, coveredControls, totalControls, loading: edLoading, refetch: refetchExpected } = useClientExpectedDocuments(mission.id)
  const { interviews, loading: intLoading } = useClientInterviews(mission.id)

  const initialResponses = new Map<string, unknown>()
  for (const r of responses) {
    const val = r.response
    if (val && typeof val === 'object' && 'value' in val) {
      initialResponses.set(r.question_code, (val as { value: unknown }).value)
    }
  }

  const triggerFileInput = useCallback((docName: string | null, controlIds?: string[]): void => {
    setPendingDocName(docName)
    setPendingControlIds(controlIds ?? [])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }, [])

  const handleFileSelected = useCallback(async (): Promise<void> => {
    const file = fileInputRef.current?.files?.[0]
    if (!file || !profile) return

    // Use [EVIDENCE:xxx] prefix in description for matching
    const description = pendingDocName ? `[EVIDENCE:${pendingDocName}]` : ''

    // Upload file to storage
    const safeName = file.name
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
    const filePath = `missions/${mission.id}/${Date.now()}_${safeName}`

    const { error: storageError } = await supabase.storage.from('documents').upload(filePath, file)
    if (storageError) {
      setUploadSuccess(null)
      setLocalUploadError(`Erreur lors de l\u2019upload : ${storageError.message}`)
      setPendingDocName(null)
      setPendingControlIds([])
      return
    }

    // Insert document record with control_id from the expected document
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setPendingDocName(null); setPendingControlIds([]); return }

    const controlId = pendingControlIds.length > 0 ? pendingControlIds[0] : null

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
        uploaded_by: profile.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type || null,
        description,
      }),
    })

    if (res.ok) {
      // Trigger background Anthropic Files API upload (non-blocking)
      try {
        const inserted = await res.json() as { id: string }[]
        const docId = inserted?.[0]?.id
        if (docId) registerDocumentForAI(docId, file.name)
      } catch { /* ignore \u2014 upload still succeeded */ }

      setUploadSuccess(pendingDocName ? `\u00ab ${pendingDocName} \u00bb d\u00e9pos\u00e9 avec succ\u00e8s` : `\u00ab ${file.name} \u00bb d\u00e9pos\u00e9 avec succ\u00e8s`)
      setTimeout(() => setUploadSuccess(null), 4000)
      refetchDocs()
      setTimeout(() => refetchExpected(), 500)
    }
    setPendingDocName(null)
    setPendingControlIds([])
  }, [mission.id, profile, pendingDocName, pendingControlIds, refetchDocs, refetchExpected])

  const handleDrop = useCallback(async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    const ok = await uploadDocument(file, '')
    if (ok) {
      setUploadSuccess(`\u00ab ${file.name} \u00bb d\u00e9pos\u00e9 avec succ\u00e8s`)
      setTimeout(() => setUploadSuccess(null), 4000)
      refetchDocs()
      setTimeout(() => refetchExpected(), 500)
    }
  }, [uploadDocument, refetchDocs, refetchExpected])

  const linkExistingDoc = useCallback(async (existingDoc: { file_name: string; file_path: string; file_size: number | null; mime_type: string | null }, evidenceName: string, controlIds?: string[]): Promise<void> => {
    if (!profile) return
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) return

    const controlId = controlIds && controlIds.length > 0 ? controlIds[0] : null

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

    if (linkRes.ok) {
      try {
        const inserted = await linkRes.json() as { id: string }[]
        const docId = inserted?.[0]?.id
        if (docId) registerDocumentForAI(docId, existingDoc.file_name)
      } catch { /* ignore */ }
    }

    setUploadSuccess(`\u00ab ${existingDoc.file_name} \u00bb li\u00e9 \u00e0 \u00ab ${evidenceName} \u00bb`)
    setTimeout(() => setUploadSuccess(null), 4000)
    setLinkingDocName(null)
    refetchDocs()
    setTimeout(() => refetchExpected(), 500)
  }, [mission.id, profile, refetchDocs, refetchExpected])

  // Documents available for linking (already uploaded, not yet linked to the current evidence)
  const availableForLinking = documents.filter((d) => {
    if (!linkingDocName) return false
    return !d.description?.includes(`[EVIDENCE:${linkingDocName}]`)
  })

  return (
    <div className="space-y-8">
      {/* Single hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv,.doc,.docx"
        onChange={handleFileSelected} />

      {/* ═══ SECTION: Documents ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Paperclip size={15} className="text-forest-700" />
          <h3 className="text-sm font-bold">Documents</h3>
          {pendingCount > 0 && <span className="text-[10px] font-medium text-gold-600 bg-gold-50 px-2 py-0.5 rounded-full">{pendingCount} en attente</span>}
          {uploadedCount > 0 && <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{uploadedCount} d&eacute;pos&eacute;{uploadedCount > 1 ? 's' : ''}</span>}
        </div>

        {/* Success */}
        {uploadSuccess && (
          <div className="flex items-center gap-2 p-2.5 mb-3 bg-green-50 border border-green-200 rounded-lg">
            <Check size={15} className="text-green-600" />
            <p className="text-xs text-green-700 font-medium">{uploadSuccess}</p>
          </div>
        )}

        {/* Upload zone */}
        {isContributor && (
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
                <p className="text-[10px] text-gray-400 mt-1">PDF, DOCX, XLSX &mdash; 25 Mo max</p>
              </>
            )}
          </div>
        )}
        {(uploadError || localUploadError) && <p className="text-xs text-red-500 mb-2">{uploadError ?? localUploadError}</p>}

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
                    doc.status === 'uploaded' ? 'bg-forest-50 border-forest-200' : 'bg-white border-gray-200 hover:border-forest-300'
                  }`}>
                    <span className="mt-0.5">{doc.status === 'uploaded' ? <FileText size={16} className="text-forest-700" /> : <BookOpen size={16} className="text-gold-500" />}</span>
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
                    </div>
                    <div className="shrink-0 mt-0.5 flex flex-col gap-1">
                      {doc.status === 'uploaded' ? (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check size={13} className="text-white" />
                        </div>
                      ) : isContributor ? (
                        <>
                          <button
                            onClick={() => triggerFileInput(doc.name, doc.controlIds)}
                            disabled={uploading}
                            className="px-3 py-1.5 border border-forest-300 rounded-lg text-[10px] font-semibold text-forest-700 bg-forest-50 hover:bg-forest-100 transition-colors disabled:opacity-50"
                          >
                            {uploading && pendingDocName === doc.name ? (
                              <span className="w-3 h-3 border-2 border-forest-300 border-t-forest-700 rounded-full animate-spin inline-block" />
                            ) : (
                              <><Paperclip size={11} /> D&eacute;poser</>
                            )}
                          </button>
                          {documents.length > 0 && (
                            <button
                              onClick={() => setLinkingDocName(linkingDocName === doc.name ? null : doc.name)}
                              className="px-3 py-1 border border-gray-200 rounded-lg text-[9px] text-gray-400 hover:text-forest-700 hover:border-forest-300 transition-colors"
                            >
                              <Link2 size={10} /> Lier existant
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gold-500" />
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
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-gold-500" />
          <h3 className="text-sm font-bold">Questionnaire intelligent</h3>
        </div>
        {qLoading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center"><p className="text-xs text-gray-400">Chargement...</p></div>
        ) : instance && questions.length > 0 ? (
          <SmartInterviewContainer missionId={mission.id} missionName={mission.name} questions={questions} instanceId={instance.id} userId={profile?.id ?? null} initialResponses={initialResponses} readOnly={!isContributor} documentsCount={documents.length} />
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center"><p className="text-xs text-gray-400">Aucun questionnaire pour cette mission.</p></div>
        )}
      </section>

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
    </div>
  )
}
