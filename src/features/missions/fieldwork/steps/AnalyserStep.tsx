import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag'
import { CONFORMITY_LEVELS } from '../../mission-constants'
import type { AssessmentWithControl } from '../../useAuditorAssessments'
import type { Document } from '../../../../types/database.types'

import type { ConformityLevel } from '../../mission-constants'

interface AnalyserStepProps {
  assessment: AssessmentWithControl
  observations: string
  evidenceNotes: string
  documents: Document[]
  findings: string
  recommendations: string
  riskNotes: string
  conformityLevel: ConformityLevel | null
  findingClassification: string | null
  onFindingClassificationChange: (value: string | null) => void
  onFindingsChange: (value: string) => void
  onRecommendationsChange: (value: string) => void
  onRiskNotesChange: (value: string) => void
  onConformityChange: (level: ConformityLevel) => void
  readOnly: boolean
}

const LEVEL_COLORS: Record<string, { text: string }> = {
  nc: { text: 'text-red-600' },
  pc: { text: 'text-amber-600' },
  lc: { text: 'text-gold-600' },
  c: { text: 'text-green-600' },
  na: { text: 'text-gray-400' },
}

interface AiAnalysis {
  analysis_summary: string
  confidence: number
  maturity_level: string
  maturity_justification: string
  findings: string
  recommendations: string
  risk: string
  docs_analyzed: number
}

const MATURITY_LABELS: Record<string, { label: string; color: string }> = {
  non_conforme: { label: 'Non conforme', color: 'text-red-600 bg-red-50 border-red-200' },
  partiel: { label: 'Partiellement conforme', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  largement_conforme: { label: 'Largement conforme', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  conforme: { label: 'Conforme', color: 'text-green-600 bg-green-50 border-green-200' },
  non_applicable: { label: 'Non applicable', color: 'text-gray-500 bg-gray-50 border-gray-200' },
}

const FINDING_CLASSIFICATIONS = [
  { key: 'major_nc', label: 'NC Majeure', color: 'bg-red-50 text-red-600 border-red-200' },
  { key: 'minor_nc', label: 'NC Mineure', color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { key: 'observation', label: 'Observation', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { key: 'strength', label: 'Point fort', color: 'bg-green-50 text-green-600 border-green-200' },
] as const

const CONFORMITY_TO_CLASSIFICATION: Record<string, string> = {
  nc: 'major_nc',
  pc: 'minor_nc',
  lc: 'observation',
  c: 'strength',
}

export function AnalyserStep({ assessment, observations, evidenceNotes, findings, recommendations, riskNotes, conformityLevel, findingClassification, onFindingClassificationChange, onFindingsChange, onRecommendationsChange, onRiskNotesChange, onConformityChange, readOnly }: AnalyserStepProps) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null)
  const aiFlag = useFeatureFlag('smart_analyse_control')

  const handleAiSuggest = async () => {
    setAiLoading(true)
    setAiAnalysis(null)

    // Documents are downloaded + encoded server-side now (like SENCOMPLY)
    const { data, error: fnErr } = await supabase.functions.invoke('smart-analyse', {
      body: {
        mission_id: assessment.mission_id,
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
      // Fallback local — show panel too
      const s = localSuggest(assessment, observations)
      setAiAnalysis({
        analysis_summary: `Analyse locale (l\u2019IA n\u2019a pas pu \u00eatre contact\u00e9e). Les suggestions sont bas\u00e9es sur les mots-cl\u00e9s des observations.`,
        confidence: observations.trim() ? 40 : 15,
        maturity_level: observations.toLowerCase().includes('en place') || observations.toLowerCase().includes('conforme') ? 'largement_conforme' : 'partiel',
        maturity_justification: 'Estimation locale bas\u00e9e sur les observations.',
        findings: s.findings,
        recommendations: s.recommendations,
        risk: s.risk,
        docs_analyzed: 0,
      })
    } else {
      // Show analysis panel from AI
      setAiAnalysis({
        analysis_summary: data.analysis_summary ?? '',
        confidence: data.confidence ?? 0,
        maturity_level: data.maturity_level ?? 'partiel',
        maturity_justification: data.maturity_justification ?? '',
        findings: data.findings ?? '',
        recommendations: data.recommendations ?? '',
        risk: data.risk ?? '',
        docs_analyzed: data.docs_analyzed ?? 0,
      })
    }
    setAiLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[13px] font-semibold text-gray-900">{'\uD83D\uDD2C'} Analyser</h4>
          <p className="text-xs text-gray-300 mt-0.5">{'\u00c9'}valuez le contr{'\u00f4'}le et r{'\u00e9'}digez vos constats.</p>
        </div>
        {!readOnly && !aiFlag.loading && aiFlag.enabled && (
          <button onClick={handleAiSuggest} disabled={aiLoading}
            className="text-[11px] font-semibold text-white bg-purple-500 px-3 py-1.5 rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-1.5 shrink-0">
            {aiLoading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {aiLoading ? 'Analyse...' : '\u2733 Suggestion IA'}
          </button>
        )}
      </div>

      {/* AI Analysis Panel */}
      {aiAnalysis && (
        <div className="border border-purple-200 rounded-xl overflow-hidden bg-white">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
            <div className="flex items-center gap-2">
              <span className="text-sm">{'\u2733'}</span>
              <span className="text-xs font-semibold text-purple-800">Rapport d{'\u2019'}analyse IA</span>
              <span className="text-[10px] text-purple-500">{aiAnalysis.docs_analyzed} doc{aiAnalysis.docs_analyzed > 1 ? 's' : ''} analys{'\u00e9'}{aiAnalysis.docs_analyzed > 1 ? 's' : ''}</span>
            </div>
            <button onClick={() => setAiAnalysis(null)} className="text-purple-400 hover:text-purple-600 text-xs">{'\u2715'}</button>
          </div>

          {/* Confidence + Maturity */}
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

          {/* Analysis summary */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">{'\uD83D\uDD0D'} Ce que l{'\u2019'}IA a analys{'\u00e9'}</p>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{aiAnalysis.analysis_summary}</p>
          </div>

          {/* Preview of generated content */}
          <div className="px-4 py-3 space-y-2.5">
            <div>
              <p className="text-[10px] font-semibold text-gray-500 mb-1">Constats propos{'\u00e9'}s</p>
              <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">{aiAnalysis.findings}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 mb-1">Risque identifi{'\u00e9'}</p>
              <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-2">{aiAnalysis.risk}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-500 mb-1">Recommandations</p>
              <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">{aiAnalysis.recommendations}</p>
            </div>
          </div>

          {/* Apply button */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[10px] text-gray-400">Vous pouvez modifier les champs apr{'\u00e8'}s application.</p>
            <button onClick={() => {
              onFindingsChange(aiAnalysis.findings)
              onRecommendationsChange(aiAnalysis.recommendations)
              onRiskNotesChange(aiAnalysis.risk)
              // Map AI maturity to conformity level
              const maturityMap: Record<string, ConformityLevel> = {
                non_conforme: 'nc', partiel: 'pc', largement_conforme: 'lc', conforme: 'c', non_applicable: 'na'
              }
              const mapped = maturityMap[aiAnalysis.maturity_level]
              if (mapped) {
                onConformityChange(mapped)
                const suggestedClassification = CONFORMITY_TO_CLASSIFICATION[mapped]
                if (suggestedClassification) onFindingClassificationChange(suggestedClassification)
              }
              setAiAnalysis(null)
            }} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 transition-colors">
              {'\u2713'} Appliquer les suggestions
            </button>
          </div>
        </div>
      )}

      {/* Existing AI draft */}
      {assessment.ai_draft && !findings && (
        <div className="flex items-start gap-2.5 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="w-6 h-6 rounded-md bg-purple-500 text-white flex items-center justify-center text-xs shrink-0">{'\u2733'}</div>
          <div className="flex-1 text-xs text-purple-800 leading-relaxed">{assessment.ai_draft}</div>
          <button onClick={() => onFindingsChange(assessment.ai_draft ?? '')} className="text-[10px] text-purple-600 bg-white border border-purple-200 px-2 py-1 rounded hover:bg-purple-50 shrink-0">Utiliser</button>
        </div>
      )}

      {/* Conformity level — interactive */}
      <div>
        <p className="text-[13px] font-semibold text-gray-700 mb-2">Niveau de conformit{'\u00e9'}</p>
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

      {/* Finding classification — shown when conformity is set and not N/A */}
      {conformityLevel && conformityLevel !== 'na' && (
        <div>
          <p className="text-[13px] font-semibold text-gray-700 mb-2">Classification du constat</p>
          <div className="flex gap-2">
            {FINDING_CLASSIFICATIONS.map((cls) => {
              const suggested = CONFORMITY_TO_CLASSIFICATION[conformityLevel] === cls.key
              const isSelected = findingClassification === cls.key
              return (
                <button key={cls.key} type="button"
                  onClick={() => !readOnly && onFindingClassificationChange(isSelected ? null : cls.key)}
                  disabled={readOnly}
                  className={`flex-1 py-2 px-2 border-2 rounded-xl text-center text-[11px] font-medium transition-all ${
                    isSelected ? `${cls.color} border-current ring-2 ring-forest-200` : suggested ? `${cls.color} border-dashed border-gray-300 opacity-70` : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  } disabled:cursor-not-allowed`}>
                  {cls.label}
                  {suggested && !isSelected && <span className="block text-[9px] text-gray-400 mt-0.5">(sugg&eacute;r&eacute;)</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Findings */}
      <div>
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Constats <span className="text-red-600">*</span></label>
        <textarea value={findings} onChange={(e) => onFindingsChange(e.target.value)} disabled={readOnly}
          placeholder={'D\u00e9crivez vos observations factuelles et les \u00e9carts constat\u00e9s...'}
          className="w-full min-h-[100px] px-4 py-3 border border-gray-200 rounded-xl text-[13px] text-gray-700 leading-relaxed outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-y disabled:bg-gray-50" />
      </div>

      {/* Risk */}
      <div>
        <label className="block text-[13px] font-semibold text-gray-700 mb-1 flex items-center gap-1.5">{'\u26A0'} Risque associ{'\u00e9'}</label>
        <p className="text-[10px] text-gray-300 mb-1.5">Quel risque ce constat repr{'\u00e9'}sente-t-il pour l{'\u2019'}organisation ?</p>
        <textarea value={riskNotes} onChange={(e) => onRiskNotesChange(e.target.value)} disabled={readOnly}
          placeholder={'Ex : Risque de fuite de donn\u00e9es en l\u2019absence de politique de chiffrement...'}
          className="w-full min-h-[60px] px-4 py-3 border border-amber-200 bg-amber-50/30 rounded-xl text-[13px] text-gray-700 leading-relaxed outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-y disabled:bg-gray-50" />
      </div>

      {/* Recommendations */}
      <div>
        <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">Recommandations</label>
        <textarea value={recommendations} onChange={(e) => onRecommendationsChange(e.target.value)} disabled={readOnly}
          placeholder={'Proposez des am\u00e9liorations concr\u00e8tes...'}
          className="w-full min-h-[80px] px-4 py-3 border border-gray-200 rounded-xl text-[13px] text-gray-700 leading-relaxed outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 resize-y disabled:bg-gray-50" />
      </div>
    </div>
  )
}

function localSuggest(a: AssessmentWithControl, obs: string): { findings: string; recommendations: string; risk: string } {
  const code = a.control.code
  const name = a.control.name
  if (!obs.trim()) {
    return {
      findings: `Le contr\u00f4le ${code} (${name}) doit \u00eatre \u00e9valu\u00e9.\n\n\u00c0 v\u00e9rifier :\n- Existence de la documentation\n- Mise en \u0153uvre effective\n- Preuves de fonctionnement`,
      recommendations: `1. V\u00e9rifier la conformit\u00e9 du contr\u00f4le ${code}\n2. Collecter les preuves\n3. Documenter les \u00e9carts`,
      risk: `Risque de non-conformit\u00e9 sur ${code} si les exigences ne sont pas satisfaites.`,
    }
  }
  const lower = obs.toLowerCase()
  const hasGap = ['manque', 'absent', 'pas de', 'incomplet', 'aucun'].some((k) => lower.includes(k))
  return {
    findings: `Observations pour ${code} (${name}) :\n\n${obs}\n\n${hasGap ? 'Des \u00e9carts ont \u00e9t\u00e9 identifi\u00e9s.' : 'Le contr\u00f4le semble en place.'}`,
    recommendations: hasGap
      ? `1. Formaliser les \u00e9l\u00e9ments manquants\n2. Mettre en place les mesures correctives\n3. Planifier un suivi`
      : `1. Maintenir les bonnes pratiques\n2. Documenter les preuves\n3. Revue p\u00e9riodique`,
    risk: hasGap
      ? `Risque \u00e9lev\u00e9 : les lacunes sur ${code} peuvent exposer l\u2019organisation \u00e0 des incidents.`
      : `Risque faible : le contr\u00f4le est op\u00e9rationnel. Surveiller la p\u00e9rennit\u00e9.`,
  }
}
