import { useRef } from 'react'
import { Paperclip, X } from 'lucide-react'
import { CONFORMITY_LEVELS } from '../mission-constants'
import { FindingsEditor } from './findings/FindingsEditor'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { AssessmentWithControl } from '../useAuditorAssessments'
import type { UseAssessmentFindingsReturn } from './findings/useAssessmentFindings'
import type { Document } from '../../../types/database.types'

interface FreeWorkFormProps {
  assessment: AssessmentWithControl
  observations: string
  evidenceNotes: string
  conformityLevel: string | null
  onConformityChange: (v: string) => void
  documents: Document[]
  uploading: boolean
  uploadError: string | null
  onUpload: (file: File, description: string) => Promise<boolean>
  onDeleteDoc: (docId: string, filePath: string) => Promise<boolean>
  findingsHook: UseAssessmentFindingsReturn
  onObservationsChange: (v: string) => void
  onEvidenceNotesChange: (v: string) => void
  readOnly: boolean
}

export function FreeWorkForm(props: FreeWorkFormProps){
  const { assessment, readOnly, findingsHook } = props
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File): Promise<void> => {
    const ok = await props.onUpload(file, '')
    if (ok && fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-6 space-y-5">
      {assessment.control.description && (
        <div className="bg-[#FAFAF8] border border-gray-100 rounded-lg p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Description</p>
          <p className="text-[13px] text-gray-500 leading-relaxed">{assessment.control.description}</p>
        </div>
      )}

      <div>
        <p className="text-[13px] font-semibold text-gray-700 mb-2">Niveau de conformit&eacute;</p>
        <div className="flex gap-2">
          {CONFORMITY_LEVELS.map((level) => {
            const selected = props.conformityLevel === level.key
            return (
              <button
                key={level.key}
                type="button"
                onClick={() => props.onConformityChange(level.key)}
                disabled={readOnly}
                className={`flex-1 py-2 border-2 rounded-xl text-center transition-all ${
                  selected ? 'border-forest-500 bg-forest-50' : 'border-gray-200 hover:border-forest-300'
                } ${readOnly ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
              >
                <p className={`text-lg font-bold ${selected ? 'text-forest-700' : 'text-gray-500'}`}>{level.short}</p>
                <p className={`text-[10px] ${selected ? 'text-forest-600' : 'text-gray-400'}`}>{level.label}</p>
              </button>
            )
          })}
        </div>
      </div>

      <Field label="Observations terrain" value={props.observations} onChange={props.onObservationsChange} disabled={readOnly}
        placeholder="Notez ce que vous avez observ&eacute;..." rows={3} />

      <FindingsEditor findingsHook={findingsHook} readOnly={readOnly} />

      <Field label="Notes sur les preuves" value={props.evidenceNotes} onChange={props.onEvidenceNotesChange} disabled={readOnly}
        placeholder="D&eacute;crivez les preuves collect&eacute;es..." rows={2} />

      <div>
        <p className="text-[13px] font-semibold text-gray-700 mb-1.5">Pi&egrave;ces jointes</p>
        {props.uploadError && <div className="mb-2"><ErrorAlert message={props.uploadError} /></div>}
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          disabled={readOnly || props.uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f) }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={readOnly || props.uploading}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-forest-300 hover:bg-forest-50 transition-colors disabled:opacity-50"
        >
          <div className="flex justify-center text-gray-300 mb-1"><Paperclip size={18} /></div>
          <p className="text-xs text-gray-500">
            {props.uploading ? 'Téléversement…' : <>Cliquez pour <span className="text-forest-700 font-medium underline">parcourir</span></>}
          </p>
        </button>
        {props.documents.length > 0 && (
          <ul className="mt-2 space-y-1">
            {props.documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-[12px]">
                <Paperclip size={13} className="text-gray-400 shrink-0" />
                <span className="flex-1 truncate text-gray-700">{doc.file_name}</span>
                {!readOnly && (
                  <button type="button" onClick={() => void props.onDeleteDoc(doc.id, doc.file_path)} className="text-gray-400 hover:text-red-600" aria-label="Supprimer">
                    <X size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, disabled, placeholder, rows, required }: {
  label: string; value: string; onChange: (v: string) => void; disabled: boolean; placeholder: string; rows: number; required?: boolean
}){
  return (
    <div>
      <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[13px] text-gray-700 leading-relaxed outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-y disabled:bg-gray-50"
      />
    </div>
  )
}
