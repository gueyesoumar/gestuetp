import { SafeMarkdown } from '../../../../components/ui/SafeMarkdown'
import type { FindingClassification, FindingPriority } from '../findings/useAssessmentFindings'

export interface AiFinding {
  classification: FindingClassification
  description: string
  risk: string | null
  recommendation: string | null
  priority: FindingPriority | null
  proposed_deadline_days: number | null
}

export interface AiAnalysis {
  analysis_summary: string
  confidence: number
  maturity_level: string
  maturity_justification: string
  findings: AiFinding[]
  docs_analyzed: number
}

const FINDING_CARD_COLORS: Record<FindingClassification, string> = {
  major_nc: 'bg-red-50 border-red-200 text-red-700',
  minor_nc: 'bg-orange-50 border-orange-200 text-orange-700',
  observation: 'bg-blue-50 border-blue-200 text-blue-700',
  strength: 'bg-green-50 border-green-200 text-green-700',
}

const FINDING_CARD_LABELS: Record<FindingClassification, string> = {
  major_nc: 'NC majeure',
  minor_nc: 'NC mineure',
  observation: 'Observation',
  strength: 'Point fort',
}

const PRIORITY_LABELS: Record<FindingPriority, string> = {
  critical: 'Critique',
  high: 'Haute',
  medium: 'Moyenne',
  low: 'Faible',
}

const MATURITY_LABELS: Record<string, { label: string; color: string }> = {
  non_conforme: { label: 'Non conforme', color: 'text-red-600 bg-red-50 border-red-200' },
  partiel: { label: 'Partiellement conforme', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  largement_conforme: { label: 'Largement conforme', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  conforme: { label: 'Conforme', color: 'text-green-600 bg-green-50 border-green-200' },
  non_applicable: { label: 'Non applicable', color: 'text-gray-500 bg-gray-50 border-gray-200' },
}

function confidenceColor(value: number): string {
  if (value >= 80) return '#27AE60'
  if (value >= 50) return '#E67E22'
  return '#C0392B'
}

function confidenceTextColor(value: number): string {
  if (value >= 80) return 'text-green-600'
  if (value >= 50) return 'text-amber-600'
  return 'text-red-500'
}

interface AiAnalysisPanelProps {
  aiAnalysis: AiAnalysis
  onClose: () => void
  onApply: () => Promise<void>
}

export function AiAnalysisPanel({ aiAnalysis, onClose, onApply }: AiAnalysisPanelProps) {
  const maturityCfg = MATURITY_LABELS[aiAnalysis.maturity_level]
  const docPlural = aiAnalysis.docs_analyzed > 1 ? 's' : ''

  return (
    <div className="border border-purple-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <span className="text-sm">{'✳'}</span>
          <span className="text-xs font-semibold text-purple-800">Rapport d&apos;analyse IA</span>
          <span className="text-[10px] text-purple-500">{aiAnalysis.docs_analyzed} doc{docPlural} analys&eacute;{docPlural}</span>
        </div>
        <button onClick={onClose} className="text-purple-400 hover:text-purple-600 text-xs">&times;</button>
      </div>

      <div className="flex gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex-1 flex items-center gap-3">
          <div className="text-center">
            <div className={`text-2xl font-bold ${confidenceTextColor(aiAnalysis.confidence)}`}>
              {aiAnalysis.confidence}%
            </div>
            <div className="text-[9px] text-gray-400 uppercase tracking-wide">Confiance</div>
          </div>
          <div className="flex-1 h-2 bg-gray-200 rounded-full">
            <div className="h-2 rounded-full transition-all" style={{
              width: `${aiAnalysis.confidence}%`,
              background: confidenceColor(aiAnalysis.confidence),
            }} />
          </div>
        </div>
        <div className="shrink-0">
          <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border ${maturityCfg?.color ?? 'text-gray-500 bg-gray-50 border-gray-200'}`}>
            {maturityCfg?.label ?? aiAnalysis.maturity_level}
          </span>
          {aiAnalysis.maturity_justification && (
            <p className="text-[9px] text-gray-400 mt-1 max-w-[200px]">{aiAnalysis.maturity_justification}</p>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">&#x1F50D; Ce que l&apos;IA a analys&eacute;</p>
        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.analysis_summary}</p>
      </div>

      <div className="px-4 py-3 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Constats propos&eacute;s ({aiAnalysis.findings.length})
        </p>
        {aiAnalysis.findings.length === 0 && (
          <p className="text-[11px] italic text-gray-400">Aucun constat &mdash; conformit&eacute; totale ou non applicable.</p>
        )}
        {aiAnalysis.findings.map((f, idx) => (
          <div key={idx} className={`border rounded-lg px-3 py-2 ${FINDING_CARD_COLORS[f.classification]}`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wide">{FINDING_CARD_LABELS[f.classification]}</span>
              {f.priority && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-white/60 border border-current/20">
                  {PRIORITY_LABELS[f.priority]}
                </span>
              )}
              {f.proposed_deadline_days != null && (
                <span className="text-[9px] text-current/70 ml-auto">{f.proposed_deadline_days}j</span>
              )}
            </div>
            <SafeMarkdown className="text-[11px] text-gray-700 leading-relaxed">{f.description}</SafeMarkdown>
            {f.risk && (
              <p className="text-[10px] text-gray-600 mt-1.5 leading-relaxed">
                <span className="font-semibold">Risque :</span>{' '}
                <SafeMarkdown inline>{f.risk}</SafeMarkdown>
              </p>
            )}
            {f.recommendation && (
              <p className="text-[10px] text-gray-600 mt-1 leading-relaxed">
                <span className="font-semibold">Reco :</span>{' '}
                <SafeMarkdown inline>{f.recommendation}</SafeMarkdown>
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <p className="text-[10px] text-gray-400">
          {aiAnalysis.findings.length === 0 ? 'Rien à appliquer.' : 'Crée les constats dans la liste ci-dessous.'}
        </p>
        <button onClick={() => void onApply()} disabled={aiAnalysis.findings.length === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
          &#x2713; Appliquer les suggestions
        </button>
      </div>
    </div>
  )
}
