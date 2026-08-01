import { Paperclip, Check, Sparkles, FileText, BarChart3 } from 'lucide-react'
import { ExpectedDocCard } from './ExpectedDocCard'
import { formatList, MAX_FILE_SIZE_LABEL } from '../../../missions/uploadValidation'
import type { Document } from '../../../../types/database.types'
import type { ExpectedDocument } from '../../smart-interview/useClientExpectedDocuments'
import type { ClientEvidenceUploadApi } from './useClientEvidenceUpload'
import type { EvidenceDeclineApi } from './useEvidenceDeclineFlow'

interface Props {
  canContribute: boolean
  uploading: boolean
  documents: Document[]
  expectedDocs: ExpectedDocument[]
  edLoading: boolean
  pendingCount: number
  uploadedCount: number
  declinedCount: number
  coveredControls: number
  totalControls: number
  upload: ClientEvidenceUploadApi
  decline: EvidenceDeclineApi
}

/** Section « Documents » du portail client (extraite de ClientExchangesTab, CLAUDE.md §2). */
export function DocumentsSection({
  canContribute, uploading, documents, expectedDocs, edLoading,
  pendingCount, uploadedCount, declinedCount, coveredControls, totalControls,
  upload, decline,
}: Props): JSX.Element {
  return (
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
          onClick={() => upload.triggerFileInput(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={upload.handleDrop}
        >
          {uploading && !upload.pendingDocName ? (
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
              <ExpectedDocCard
                key={doc.id}
                doc={doc}
                canContribute={canContribute}
                uploading={uploading}
                hasDocuments={documents.length > 0}
                upload={upload}
                declineSubmitting={decline.declineSubmitting}
                onDecline={(d) => { decline.setDeclineError(null); decline.setDecliningDoc(d) }}
                onCancelDecline={decline.handleCancelDecline}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-forest-50 border border-forest-100 rounded-lg">
            <BarChart3 size={13} className="text-forest-700" />
            <p className="text-[10px] text-forest-700">
              <b>{expectedDocs.length} documents</b> couvrent <b>{coveredControls}/{totalControls} contr&ocirc;les</b>.
              {pendingCount > 0 && ` Déposez les ${pendingCount} restants pour optimiser l’analyse IA.`}
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
  )
}
