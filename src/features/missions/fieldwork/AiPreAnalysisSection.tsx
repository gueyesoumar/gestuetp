import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'
import { useFeatureFlag } from '../../../hooks/useFeatureFlag'
import { AiPreflightPanel } from '../../../components/ui/AiPreflightPanel'
import { isAiSkip } from '../aiSkip'
import { AiAnalysisPanel, type AiAnalysis, type AiFinding } from './steps/AiAnalysisPanel'
import type { ConformityLevel } from '../mission-constants'
import type { AssessmentWithControl } from '../useAuditorAssessments'
import type { UseAssessmentFindingsReturn, NewFindingInput } from './findings/useAssessmentFindings'

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

interface AiPreAnalysisSectionProps {
  assessment: AssessmentWithControl
  observations: string
  evidenceNotes: string
  findingsHook: UseAssessmentFindingsReturn
  conformityLevel: string | null
  onConformityChange: (level: ConformityLevel) => void
  readOnly: boolean
}

/**
 * Pré-analyse IA de l'écran unique (flag smart_analyse_control) : bouton
 * « Suggestion IA » → smart-analyse → panneau de résultats applicables en
 * constats. Extrait de l'ex-AnalyserStep du wizard guidé.
 */
export function AiPreAnalysisSection({ assessment, observations, evidenceNotes, findingsHook, conformityLevel, onConformityChange, readOnly }: AiPreAnalysisSectionProps) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null)
  const [aiSkip, setAiSkip] = useState<string | null>(null)
  const aiFlag = useFeatureFlag('smart_analyse_control')

  // Section masquée tant que le flag n'est pas actif pour l'organisation.
  if (!aiFlag.loading && !aiFlag.enabled) return null

  const handleAiSuggest = async (): Promise<void> => {
    setAiLoading(true)
    setAiAnalysis(null)
    setAiSkip(null)

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

    if (isAiSkip(data?.skipped_reason)) {
      setAiSkip(data.skipped_reason)
      setAiLoading(false)
      return
    }

    if (fnErr || data?.error) {
      const detail = await readInvokeError(fnErr, data, 'Analyse IA indisponible.')
      console.warn('smart-analyse fallback:', detail)
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

  const handleApply = async (): Promise<void> => {
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
      // Priorité : suggested_conformity_level (dérivé serveur, matrice métier) ;
      // fallback : MATURITY_TO_CONFORMITY (mapping legacy depuis maturity_level).
      const next = aiAnalysis.suggested_conformity_level ?? MATURITY_TO_CONFORMITY[aiAnalysis.maturity_level]
      if (next) onConformityChange(next)
    }
    setAiAnalysis(null)
  }

  return (
    <div className="space-y-3">
      {!readOnly && !aiFlag.loading && aiFlag.enabled && !aiAnalysis && (
        <button
          onClick={() => void handleAiSuggest()}
          disabled={aiLoading}
          className="text-[11px] font-semibold text-forest-900 bg-gold-500 hover:bg-gold-600 px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1.5 transition-colors"
        >
          {aiLoading && <span className="w-3 h-3 border-2 border-forest-900/30 border-t-forest-900 rounded-full animate-spin" />}
          {aiLoading ? 'Analyse...' : '✳ Laisser l’IA pré-analyser'}
        </button>
      )}

      <AiPreflightPanel reason={aiSkip} onDismiss={() => setAiSkip(null)} />

      {aiAnalysis && (
        <AiAnalysisPanel
          aiAnalysis={aiAnalysis}
          onClose={() => setAiAnalysis(null)}
          onApply={handleApply}
          onRegenerate={handleAiSuggest}
          regenerating={aiLoading}
        />
      )}
    </div>
  )
}
