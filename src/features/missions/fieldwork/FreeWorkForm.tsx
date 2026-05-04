import { Paperclip } from 'lucide-react'
import { CONFORMITY_LEVELS } from '../mission-constants'
import { FindingsEditor } from './findings/FindingsEditor'
import type { AssessmentWithControl } from '../useAuditorAssessments'
import type { UseAssessmentFindingsReturn } from './findings/useAssessmentFindings'

interface FreeWorkFormProps {
  assessment: AssessmentWithControl
  observations: string
  evidenceNotes: string
  findingsHook: UseAssessmentFindingsReturn
  onObservationsChange: (v: string) => void
  onEvidenceNotesChange: (v: string) => void
  readOnly: boolean
}

export function FreeWorkForm(props: FreeWorkFormProps){
  const { assessment, readOnly, findingsHook } = props

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-5">
      {assessment.control.description && (
        <div className="bg-[#FAFAF8] border border-gray-100 rounded-lg p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Description</p>
          <p className="text-[13px] text-gray-500 leading-relaxed">{assessment.control.description}</p>
        </div>
      )}

      <div>
        <p className="text-[13px] font-semibold text-gray-700 mb-2">Niveau de conformit&eacute;</p>
        <div className="flex gap-2">
          {CONFORMITY_LEVELS.map((level) => (
            <div key={level.key} className="flex-1 py-2 border-2 border-gray-200 rounded-xl text-center cursor-pointer hover:border-forest-300 transition-all">
              <p className="text-lg font-bold text-gray-500">{level.short}</p>
              <p className="text-[10px] text-gray-400">{level.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Field label="Observations terrain" value={props.observations} onChange={props.onObservationsChange} disabled={readOnly}
        placeholder="Notez ce que vous avez observ&eacute;..." rows={3} />

      <FindingsEditor findingsHook={findingsHook} readOnly={readOnly} />

      <Field label="Notes sur les preuves" value={props.evidenceNotes} onChange={props.onEvidenceNotesChange} disabled={readOnly}
        placeholder="D&eacute;crivez les preuves collect&eacute;es..." rows={2} />

      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-forest-300 hover:bg-forest-50 transition-colors cursor-pointer">
        <div className="flex justify-center text-gray-300 mb-1"><Paperclip size={18} /></div>
        <p className="text-xs text-gray-500">Glissez-d&eacute;posez ou <span className="text-forest-700 font-medium underline">parcourir</span></p>
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
