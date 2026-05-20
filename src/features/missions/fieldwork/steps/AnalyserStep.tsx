import { useState } from 'react'
import { AlertTriangle, Sparkles } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag'
import { CONFORMITY_LEVELS } from '../../mission-constants'
import { FindingsEditor } from '../findings/FindingsEditor'
import { AiAnalysisPanel, type AiAnalysis, type AiFinding } from './AiAnalysisPanel'
import { deriveSuggestedConformity, getIncoherenceMessage, getConformityShort } from '../findings/conformityRules'
import type { ConformityLevel } from '../../mission-constants'
import type { AssessmentWithControl } from '../../useAuditorAssessments'
import type { UseAssessmentFindingsReturn, NewFindingInput } from '../findings/useAssessmentFindings'

interface AnalyserStepProps {
  assessment: AssessmentWithControl
  observations: string
  evidenceNotes: string
  findingsHook: UseAssessmentFindingsReturn
  conformityLevel: ConformityLevel | null
  onConformityChange: (level: ConformityLevel) => void
  readOnly: boolean
}

const LEVEL_TEXT_COLORS: Record<string, string> = {
  nc: 'text-red-600',
  pc: 'text-amber-600',
  lc: 'text-gold-600',
  c: 'text-green-600',
  na: 'text-gray-400',
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
        suggested_conformity_level: data.suggested_conformity_level,
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
    if (inserted > 0 && !conformityLevel) {
      // Priorite : suggested_conformity_level (derive des findings cote serveur, matrice metier)
      // Fallback : MATURITY_TO_CONFORMITY (mapping legacy depuis maturity_level)
      const suggested = aiAnalysis.suggested_conformity_level
      const fallback = MATURITY_TO_CONFORMITY[aiAnalysis.maturity_level]
      const next = suggested ?? fallback
      if (next) onConformityChange(next)
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
        {!readOnly && !aiFlag.loading && aiFlag.enabled && !aiAnalysis && (
          <button onClick={handleAiSuggest} disabled={aiLoading}
            className="text-[11px] font-semibold text-forest-900 bg-gold-500 hover:bg-gold-600 px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1.5 shrink-0 transition-colors">
            {aiLoading && <span className="w-3 h-3 border-2 border-forest-900/30 border-t-forest-900 rounded-full animate-spin" />}
            {aiLoading ? 'Analyse...' : '✳ Suggestion IA'}
          </button>
        )}
      </div>

      {aiAnalysis && (
        <AiAnalysisPanel
          aiAnalysis={aiAnalysis}
          onClose={() => setAiAnalysis(null)}
          onApply={handleApply}
          onRegenerate={handleAiSuggest}
          regenerating={aiLoading}
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-semibold text-gray-700">Niveau de conformit&eacute; global</p>
          {(() => {
            const suggested = deriveSuggestedConformity(findingsHook.findings)
            if (!suggested || readOnly) return null
            const isApplied = conformityLevel === suggested
            return (
              <div className="flex items-center gap-1.5 text-[11px]">
                <Sparkles size={11} className="text-gold-600" />
                <span className="text-gray-500">Sugg&eacute;r&eacute;&nbsp;:</span>
                <span className="font-bold text-forest-700">{getConformityShort(suggested)}</span>
                {!isApplied && (
                  <button
                    type="button"
                    onClick={() => onConformityChange(suggested)}
                    className="text-[11px] font-semibold text-forest-700 hover:text-forest-900 underline underline-offset-2"
                  >
                    Appliquer
                  </button>
                )}
              </div>
            )
          })()}
        </div>
        <div className="flex gap-2">
          {CONFORMITY_LEVELS.map((level) => {
            const isSelected = conformityLevel === level.key
            const colorCls = LEVEL_TEXT_COLORS[level.key] ?? 'text-gray-500'
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
        {(() => {
          const msg = getIncoherenceMessage(conformityLevel, findingsHook.findings)
          if (!msg) return null
          return (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertTriangle size={13} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-[12px] text-amber-800 leading-relaxed">
                {msg} <span className="font-semibold">Une justification &eacute;crite sera demand&eacute;e au moment de la soumission.</span>
              </p>
            </div>
          )
        })()}
      </div>

      <FindingsEditor findingsHook={findingsHook} readOnly={readOnly} />
    </div>
  )
}
