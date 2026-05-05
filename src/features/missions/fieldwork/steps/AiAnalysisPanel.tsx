import { Sparkles, RefreshCw, Check } from 'lucide-react'
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
  cadrage_answers_count?: number
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

function confidencePillColor(value: number): string {
  if (value >= 80) return 'bg-green-50 text-green-700 border-green-200'
  if (value >= 50) return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

function findingsBreakdown(findings: AiFinding[]): string {
  const counts = { major_nc: 0, minor_nc: 0, observation: 0, strength: 0 }
  for (const f of findings) counts[f.classification]++
  const parts: string[] = []
  if (counts.major_nc > 0) parts.push(`${counts.major_nc} NC majeure${counts.major_nc > 1 ? 's' : ''}`)
  if (counts.minor_nc > 0) parts.push(`${counts.minor_nc} mineure${counts.minor_nc > 1 ? 's' : ''}`)
  if (counts.observation > 0) parts.push(`${counts.observation} observation${counts.observation > 1 ? 's' : ''}`)
  if (counts.strength > 0) parts.push(`${counts.strength} point${counts.strength > 1 ? 's' : ''} fort${counts.strength > 1 ? 's' : ''}`)
  return parts.join(', ')
}

interface AiAnalysisPanelProps {
  aiAnalysis: AiAnalysis
  onClose: () => void
  onApply: () => Promise<void>
  onRegenerate?: () => Promise<void>
  regenerating?: boolean
}

export function AiAnalysisPanel({ aiAnalysis, onClose, onApply, onRegenerate, regenerating }: AiAnalysisPanelProps) {
  const maturityCfg = MATURITY_LABELS[aiAnalysis.maturity_level]
  const docPlural = aiAnalysis.docs_analyzed > 1 ? 's' : ''
  const cadrageCount = aiAnalysis.cadrage_answers_count ?? 0
  const cadragePlural = cadrageCount > 1 ? 's' : ''
  const sourcesText = cadrageCount > 0
    ? `${aiAnalysis.docs_analyzed} doc${docPlural} · ${cadrageCount} réponse${cadragePlural} cadrage`
    : `${aiAnalysis.docs_analyzed} doc${docPlural}`
  const breakdown = findingsBreakdown(aiAnalysis.findings)

  return (
    <div className="rounded-xl overflow-hidden border border-gold-200 bg-gradient-to-b from-gold-50 to-white">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gold-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
        <h3 className="text-[11px] font-bold uppercase tracking-wide text-gold-700 inline-flex items-center gap-1.5">
          <Sparkles size={12} /> Smart-analyse G&euml;stu IA
        </h3>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${confidencePillColor(aiAnalysis.confidence)}`}>
          Confiance {aiAnalysis.confidence}%
        </span>
        <button onClick={onClose} className="text-gold-500 hover:text-gold-700 text-sm leading-none px-1" aria-label="Fermer">&times;</button>
      </div>

      <div className="px-4 py-3 grid grid-cols-3 gap-3 border-b border-gold-100">
        <div>
          <p className="text-[9px] uppercase tracking-wide font-bold text-gray-500 mb-1">Maturité globale suggérée</p>
          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border ${maturityCfg?.color ?? 'text-gray-500 bg-gray-50 border-gray-200'}`}>
            {maturityCfg?.label ?? aiAnalysis.maturity_level}
          </span>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide font-bold text-gray-500 mb-1">Constats identifiés</p>
          <p className="text-xs text-gray-900">
            <strong>{aiAnalysis.findings.length}</strong>
            {breakdown && <span className="text-gray-500"> &middot; {breakdown}</span>}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wide font-bold text-gray-500 mb-1">Sources analysées</p>
          <p className="text-xs text-gray-900">{sourcesText}</p>
        </div>
      </div>

      {aiAnalysis.maturity_justification && (
        <div className="px-4 py-2 border-b border-gold-100 bg-white">
          <p className="text-[10px] text-gray-500 italic">{aiAnalysis.maturity_justification}</p>
        </div>
      )}

      <div className="px-4 py-3 border-b border-gold-100 bg-white">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Ce que l&apos;IA a analys&eacute;</p>
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

      <div className="px-4 py-3 bg-white border-t border-gold-100 flex items-center gap-2">
        <button onClick={() => void onApply()} disabled={aiAnalysis.findings.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gold-500 hover:bg-gold-600 text-forest-900 rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors">
          <Check size={12} /> Appliquer tout ({aiAnalysis.findings.length} constat{aiAnalysis.findings.length > 1 ? 's' : ''})
        </button>
        {onRegenerate && (
          <button onClick={() => void onRegenerate()} disabled={regenerating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gold-700 hover:bg-gold-50 rounded-lg disabled:opacity-50 transition-colors">
            <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'Régénération...' : 'Régénérer'}
          </button>
        )}
      </div>
    </div>
  )
}
