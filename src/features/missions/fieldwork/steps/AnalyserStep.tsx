import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag'
import { CONFORMITY_LEVELS } from '../../mission-constants'
import { SafeMarkdown } from '../../../../components/ui/SafeMarkdown'
import { FindingsEditor } from '../findings/FindingsEditor'
import type { ConformityLevel } from '../../mission-constants'
import type { AssessmentWithControl } from '../../useAuditorAssessments'
import type {
  UseAssessmentFindingsReturn,
  FindingClassification,
  FindingPriority,
  NewFindingInput,
} from '../findings/useAssessmentFindings'

interface AnalyserStepProps {
  assessment: AssessmentWithControl
  observations: string
  evidenceNotes: string
  findingsHook: UseAssessmentFindingsReturn
  conformityLevel: ConformityLevel | null
  onConformityChange: (level: ConformityLevel) => void
  readOnly: boolean
}

interface AiFinding {
  classification: FindingClassification
  description: string
  risk: string | null
  recommendation: string | null
  priority: FindingPriority | null
  proposed_deadline_days: number | null
}

interface AiAnalysis {
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

const LEVEL_COLORS: Record<string, { text: string }> = {
  nc: { text: 'text-red-600' },
  pc: { text: 'text-amber-600' },
  lc: { text: 'text-gold-600' },
  c: { text: 'text-green-600' },
  na: { text: 'text-gray-400' },
}

const MATURITY_TO_CONFORMITY: Record<string, ConformityLevel> = {
  non_conforme: 'nc',
  partiel: 'pc',
  largement_conforme: 'lc',
  conforme: 'c',
  non_applicable: 'na',
}

function todayPlusDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function AnalyserStep({ assessment, observations, evidenceNotes, findingsHook, conformityLevel, onConformityChange, readOnly }: AnalyserStepProps) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null)
  const aiFlag = useFeatureFlag('smart_analyse_control')

  const handleAiSuggest = async () => {
    setAiLoading(true)
    setAiAnalysis(null)

    const { data, error: fnErr } = await supabase.functions.invoke('smart-analyse', {
      body: {
        mission_id: assessment.mission_id,
        control_id: assessment.control_id,
        control_code: assessment.control.code,
        control_name: assessment.control.name,
        control_description: assessment.control.description,
        domain: `${assessment.control.domain.code} ${assessment.control.domain.name}`,
        observations,
        evidence_notes: evidenceNotes,
      },
    })

    if (fnErr || data?.error) {
      console.warn('smart-analyse fallback:', fnErr?.message ?? data?.error)
      setAiAnalysis({
        analysis_summary: 'Analyse IA indisponible. Vous pouvez ajouter manuellement vos constats.',
        confidence: 0,
        maturity_level: 'partiel',
        maturity_justification: '',
        findings: [],
        docs_analyzed: 0,
      })
    } else {
      const rawFindings = Array.isArray(data.findings) ? (data.findings as AiFinding[]) : []
      setAiAnalysis({
        analysis_summary: data.analysis_summary ?? '',
        confidence: data.confidence ?? 0,
        maturity_level: data.maturity_level ?? 'partiel',
        maturity_justification: data.maturity_justification ?? '',
        findings: rawFindings,
        docs_analyzed: data.docs_analyzed ?? 0,
      })
    }
    setAiLoading(false)
  }

  const handleApply = async () => {
    if (!aiAnalysis) return
    const drafts: NewFindingInput[] = aiAnalysis.findings.map((f) => ({
      classification: f.classification,
      description: f.description,
      risk: f.risk,
      recommendation: f.recommendation,
      priority: f.priority,
      proposed_deadline: f.proposed_deadline_days != null ? todayPlusDays(f.proposed_deadline_days) : null,
      ai_generated: true,
    }))
    const inserted = await findingsHook.bulkInsertFromAi(drafts)
    if (inserted > 0) {
      const mapped = MATURITY_TO_CONFORMITY[aiAnalysis.maturity_level]
      if (mapped && !conformityLevel) onConformityChange(mapped)
    }
    setAiAnalysis(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[13px] font-semibold text-gray-900">&#x1F52C; Analyser</h4>
          <p className="text-xs text-gray-300 mt-0.5">&Eacute;valuez le contr&ocirc;le et r&eacute;digez vos constats.</p>
        </div>
        {!readOnly && !aiFlag.loading && aiFlag.enabled && (
          <button onClick={handleAiSuggest} disabled={aiLoading}
            className="text-[11px] font-semibold text-white bg-purple-500 px-3 py-1.5 rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-1.5 shrink-0">
            {aiLoading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {aiLoading ? 'Analyse...' : '✳ Suggestion IA'}
          </button>
        )}
      </div>

      {aiAnalysis && (
        <AiAnalysisPanel aiAnalysis={aiAnalysis} onClose={() => setAiAnalysis(null)} onApply={handleApply} />
      )}

      <div>
        <p className="text-[13px] font-semibold text-gray-700 mb-2">Niveau de conformit&eacute; global</p>
        <div className="flex gap-2">
          {CONFORMITY_LEVELS.map((level) => {
            const isSelected = conformityLevel === level.key
            const colorCls = LEVEL_COLORS[level.key]?.text ?? 'text-gray-500'
            return (
              <button key={level.key} type="button"
                onClick={() => !readOnly && onConformityChange(level.key as ConformityLevel)}
                disabled={readOnly}
                className={`flex-1 py-2.5 px-1.5 border-2 rounded-xl text-center transition-all ${
                  isSelected ? 'border-forest-700 bg-forest-50 ring-2 ring-forest-200' : 'border-gray-200 hover:border-forest-300 hover:bg-forest-50'
                } disabled:cursor-not-allowed`}>
                <p className={`text-lg font-bold ${colorCls}`}>{level.short}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{level.label}</p>
              </button>
            )
          })}
        </div>
      </div>

      <FindingsEditor findingsHook={findingsHook} readOnly={readOnly} />
    </div>
  )
}

function AiAnalysisPanel({ aiAnalysis, onClose, onApply }: {
  aiAnalysis: AiAnalysis
  onClose: () => void
  onApply: () => Promise<void>
}) {
  return (
    <div className="border border-purple-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <span className="text-sm">{'✳'}</span>
          <span className="text-xs font-semibold text-purple-800">Rapport d&apos;analyse IA</span>
          <span className="text-[10px] text-purple-500">{aiAnalysis.docs_analyzed} doc{aiAnalysis.docs_analyzed > 1 ? 's' : ''} analys&eacute;{aiAnalysis.docs_analyzed > 1 ? 's' : ''}</span>
        </div>
        <button onClick={onClose} className="text-purple-400 hover:text-purple-600 text-xs">&times;</button>
      </div>

      <div className="flex gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex-1 flex items-center gap-3">
          <div className="text-center">
            <div className={`text-2xl font-bold ${aiAnalysis.confidence >= 80 ? 'text-green-600' : aiAnalysis.confidence >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
              {aiAnalysis.confidence}%
            </div>
            <div className="text-[9px] text-gray-400 uppercase tracking-wide">Confiance</div>
          </div>
          <div className="flex-1 h-2 bg-gray-200 rounded-full">
            <div className="h-2 rounded-full transition-all" style={{
              width: `${aiAnalysis.confidence}%`,
              background: aiAnalysis.confidence >= 80 ? '#27AE60' : aiAnalysis.confidence >= 50 ? '#E67E22' : '#C0392B'
            }} />
          </div>
        </div>
        <div className="shrink-0">
          <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border ${MATURITY_LABELS[aiAnalysis.maturity_level]?.color ?? 'text-gray-500 bg-gray-50 border-gray-200'}`}>
            {MATURITY_LABELS[aiAnalysis.maturity_level]?.label ?? aiAnalysis.maturity_level}
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
          {aiAnalysis.findings.length === 0 ? 'Rien &agrave; appliquer.' : 'Cr&eacute;e les constats dans la liste ci-dessous.'}
        </p>
        <button onClick={() => void onApply()} disabled={aiAnalysis.findings.length === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors">
          &#x2713; Appliquer les suggestions
        </button>
      </div>
    </div>
  )
}
