import { useMemo } from 'react'
import type { Question } from '../../../types/database.types'
import type { SmartAnswer } from './SmartInterviewContainer'

interface Props {
  questions: Question[]
  initialResponses: Map<string, unknown>
  prefilledAnswers: SmartAnswer[]
}

interface AxisData {
  label: string
  score: number | null
  maxScore: number
}

// Group questions by section prefix (GOV, MAT, OPS, INC, ATT or by domain)
function groupQuestionsBySection(questions: Question[]): Map<string, Question[]> {
  const groups = new Map<string, Question[]>()
  for (const q of questions) {
    const prefix = q.code.split('-')[0] ?? q.code.substring(0, 3)
    const existing = groups.get(prefix) ?? []
    existing.push(q)
    groups.set(prefix, existing)
  }
  return groups
}

const SECTION_LABELS: Record<string, string> = {
  GOV: 'Gouvernance',
  MAT: 'Maturit\u00e9',
  OPS: 'Op\u00e9rationnel',
  INC: 'Incidents',
  ATT: 'Attentes',
  A: 'Contr\u00f4les',
}

export function SmartRadar({ questions, initialResponses, prefilledAnswers }: Props): JSX.Element {
  const axes = useMemo((): AxisData[] => {
    const groups = groupQuestionsBySection(questions)
    const result: AxisData[] = []

    for (const [prefix, groupQuestions] of groups) {
      const totalQuestions = groupQuestions.length
      let answeredCount = 0

      for (const q of groupQuestions) {
        if (initialResponses.has(q.code)) answeredCount++
        else if (prefilledAnswers.some((a) => a.questionCode === q.code && a.validated)) answeredCount++
      }

      result.push({
        label: SECTION_LABELS[prefix] ?? prefix,
        score: answeredCount > 0 ? Math.round((answeredCount / totalQuestions) * 5) : null,
        maxScore: 5,
      })
    }
    return result
  }, [questions, initialResponses, prefilledAnswers])

  const answeredTotal = initialResponses.size + prefilledAnswers.filter((a) => a.validated).length
  const pct = questions.length > 0 ? Math.round((answeredTotal / questions.length) * 100) : 0

  // Insights
  const strengths = axes.filter((a) => a.score !== null && a.score >= 4)
  const warnings = axes.filter((a) => a.score !== null && a.score <= 2)
  const notYet = axes.filter((a) => a.score === null)

  return (
    <div className="flex gap-5">
      {/* Radar chart */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl p-5 text-center">
        <p className="text-sm font-bold mb-1">Votre maturit&eacute; SSI</p>
        <p className="text-[10px] text-gray-300 mb-4">
          Bas&eacute; sur {answeredTotal}/{questions.length} r&eacute;ponses ({pct}%)
        </p>

        {/* Simple bar chart representation */}
        <div className="space-y-2.5 max-w-sm mx-auto text-left">
          {axes.map((axis) => (
            <div key={axis.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">{axis.label}</span>
                <span className={`text-[10px] font-semibold ${
                  axis.score === null ? 'text-gray-300' :
                  axis.score >= 4 ? 'text-green-600' :
                  axis.score >= 3 ? 'text-forest-700' :
                  axis.score >= 2 ? 'text-gold-600' :
                  'text-red-500'
                }`}>
                  {axis.score !== null ? `${axis.score}/5` : '?'}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                {axis.score !== null ? (
                  <div
                    className={`h-2 rounded-full transition-all ${
                      axis.score >= 4 ? 'bg-green-500' :
                      axis.score >= 3 ? 'bg-forest-500' :
                      axis.score >= 2 ? 'bg-gold-500' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${(axis.score / axis.maxScore) * 100}%` }}
                  />
                ) : (
                  <div className="h-2 bg-gray-200 rounded-full" style={{ width: '10%' }} />
                )}
              </div>
            </div>
          ))}
        </div>

        {axes.length === 0 && (
          <p className="text-xs text-gray-400 py-8">R&eacute;pondez aux questions pour voir votre radar</p>
        )}
      </div>

      {/* Insights */}
      <div className="w-64 shrink-0 space-y-2">
        {strengths.map((s) => (
          <div key={s.label} className="p-3 border border-forest-100 rounded-xl bg-forest-50">
            <p className="text-[10px] font-semibold text-green-600 mb-1">&#10003; Point fort</p>
            <p className="text-[11px] text-gray-700">{s.label} : score {s.score}/5</p>
          </div>
        ))}

        {warnings.map((w) => (
          <div key={w.label} className="p-3 border border-gold-200 rounded-xl bg-gold-50">
            <p className="text-[10px] font-semibold text-gold-600 mb-1">&#9888; Attention</p>
            <p className="text-[11px] text-gray-700">{w.label} : score {w.score}/5</p>
          </div>
        ))}

        {notYet.length > 0 && (
          <div className="p-3 border border-gray-200 rounded-xl bg-gray-50">
            <p className="text-[10px] font-semibold text-gray-400 mb-1">&#9744; Non &eacute;valu&eacute;</p>
            <p className="text-[11px] text-gray-400">{notYet.map((n) => n.label).join(', ')}</p>
          </div>
        )}

        {strengths.length === 0 && warnings.length === 0 && notYet.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">Insights &agrave; venir</p>
        )}

        <p className="text-[9px] text-gray-300 text-center mt-2">
          Diagnostic provisoire &mdash; sera affin&eacute; par l&rsquo;auditeur
        </p>
      </div>
    </div>
  )
}
