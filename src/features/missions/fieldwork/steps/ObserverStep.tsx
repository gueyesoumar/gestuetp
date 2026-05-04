import { Eye } from 'lucide-react'
import { AuditChecklistTip } from './AuditChecklistTip'
import type { AssessmentWithControl } from '../../useAuditorAssessments'
import type { AuditChecklistItem } from '../../../../types/database.types'

interface ObserverStepProps {
  assessment: AssessmentWithControl
  observations: string
  auditChecklist: AuditChecklistItem[]
  onObservationsChange: (value: string) => void
  readOnly: boolean
}

export function ObserverStep({ assessment, observations, auditChecklist, onObservationsChange, readOnly }: ObserverStepProps){
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[13px] font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
          <Eye size={14} /> Observations terrain
        </h4>
        <p className="text-xs text-gray-300 leading-relaxed">
          Notez ce que vous avez vu, entendu, v&eacute;rifi&eacute;. L&apos;IA s&apos;appuiera sur vos observations pour analyser ce contr&ocirc;le.
        </p>
      </div>

      {assessment.control.description && (
        <div className="bg-[#FAFAF8] border border-gray-100 rounded-lg p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">Description du contr&ocirc;le</p>
          <p className="text-[13px] text-gray-500 leading-relaxed">{assessment.control.description}</p>
        </div>
      )}

      <textarea
        value={observations}
        onChange={(e) => onObservationsChange(e.target.value)}
        disabled={readOnly}
        placeholder="Ex : Nous avons re&ccedil;u un document du client pr&eacute;sentant la politique. La couverture est partielle..."
        className="w-full min-h-[140px] px-4 py-3 border border-gray-200 rounded-xl text-[13px] text-gray-700 leading-relaxed outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-y disabled:bg-gray-50 disabled:text-gray-400"
      />

      <AuditChecklistTip
        controlCode={assessment.control.code}
        controlName={assessment.control.name}
        items={auditChecklist}
      />
    </div>
  )
}
