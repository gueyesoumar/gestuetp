import { Check, FileText, BookOpen, Link2, XCircle, AlertCircle, RotateCw, Paperclip } from 'lucide-react'
import { LinkDocDropdown } from './LinkDocDropdown'
import type { ExpectedDocument } from '../../smart-interview/useClientExpectedDocuments'
import type { ClientEvidenceUploadApi } from './useClientEvidenceUpload'

interface Props {
  doc: ExpectedDocument
  canContribute: boolean
  uploading: boolean
  hasDocuments: boolean
  upload: ClientEvidenceUploadApi
  declineSubmitting: boolean
  onDecline: (doc: ExpectedDocument) => void
  onCancelDecline: (doc: ExpectedDocument) => void
}

/** Carte d'un document attendu (extraite de ClientExchangesTab, CLAUDE.md §2). */
export function ExpectedDocCard({
  doc, canContribute, uploading, hasDocuments, upload, declineSubmitting, onDecline, onCancelDecline,
}: Props): JSX.Element {
  const { pendingDocName, linkingDocName, setLinkingDocName, availableForLinking, triggerFileInput, linkExistingDoc } = upload
  return (
    <div className="flex flex-col">
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
              onClick={() => onCancelDecline(doc)}
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
              {hasDocuments && (
                <button
                  onClick={() => setLinkingDocName(linkingDocName === doc.name ? null : doc.name)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-[10.5px] font-medium text-gray-600 hover:text-forest-700 hover:border-forest-300 hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-1.5 leading-none"
                >
                  <Link2 size={11} /> Lier
                </button>
              )}
              {doc.evidenceRequestIds.length > 0 && (
                <button
                  onClick={() => onDecline(doc)}
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
        <LinkDocDropdown
          available={availableForLinking}
          evidenceName={doc.name}
          controlIds={doc.controlIds}
          onLink={linkExistingDoc}
          onClose={() => setLinkingDocName(null)}
        />
      )}
    </div>
  )
}
