import { Check, AlertTriangle, Play } from 'lucide-react'
import { Badge } from '../../../../components/ui/Badge'
import { ASSESSMENT_STATUS_CONFIG } from '../../mission-constants'
import type { AssessmentWithControl } from '../../useAuditorAssessments'

interface ValidationStepProps {
  assessment: AssessmentWithControl
  observations: string
  findings: string
  recommendations: string
  onSubmit: () => void
  saving: boolean
}

export function ValidationStep({ assessment, observations, findings, recommendations, onSubmit, saving }: ValidationStepProps){
  const canSubmit = findings.trim().length > 0
  const status = ASSESSMENT_STATUS_CONFIG[assessment.status]

  return (
    <div className="space-y-4">
      <h4 className="text-[13px] font-semibold text-gray-900 flex items-center gap-1.5">
        <Check size={14} /> Validation &amp; soumission
      </h4>
      <p className="text-xs text-gray-300 leading-relaxed -mt-2">
        V&eacute;rifiez le r&eacute;sum&eacute; de vos travaux avant de soumettre au chef de mission.
      </p>

      {/* Summary */}
      <div className="rounded-xl border border-gray-200 bg-[#FAFAF8] divide-y divide-gray-100">
        <SummaryRow label="Statut"><Badge label={status.label} variant={status.variant} /></SummaryRow>
        <SummaryRow label="Observations">
          <p className="text-[13px] text-gray-700 line-clamp-3">{observations || '\u2014'}</p>
        </SummaryRow>
        <SummaryRow label="Constats">
          <p className="text-[13px] text-gray-700 line-clamp-3">{findings || <span className="text-red-500">Non renseign&eacute; (obligatoire)</span>}</p>
        </SummaryRow>
        <SummaryRow label="Recommandations">
          <p className="text-[13px] text-gray-700 line-clamp-3">{recommendations || '\u2014'}</p>
        </SummaryRow>
      </div>

      {!canSubmit && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          <AlertTriangle size={13} className="inline mr-1" />Les constats sont obligatoires pour soumettre ce contr&ocirc;le.
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit || saving}
        className="w-full bg-forest-700 text-white py-3 rounded-xl text-[13px] font-semibold hover:bg-forest-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        <Play size={14} /> {saving ? 'Soumission...' : 'Soumettre au chef de mission'}
      </button>
    </div>
  )
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }){
  return (
    <div className="px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  )
}
