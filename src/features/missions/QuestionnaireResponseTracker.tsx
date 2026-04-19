import { Badge } from '../../components/ui/Badge'
import type { Question } from '../../types/database.types'
import type { QuestionnaireResponseData } from './useMissionQuestionnaire'

interface QuestionnaireResponseTrackerProps {
  questions: Question[]
  responses: QuestionnaireResponseData[]
  answeredCount: number
  totalCount: number
}

export function QuestionnaireResponseTracker({
  questions, responses, answeredCount, totalCount,
}: QuestionnaireResponseTrackerProps) {
  const responseMap = new Map(responses.map((r) => [r.question_code, r]))
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900">Progression du client</h4>
          <Badge
            label={`${answeredCount}/${totalCount} r\u00e9ponses (${progress}%)`}
            variant={progress === 100 ? 'green' : progress > 0 ? 'blue' : 'gray'}
          />
        </div>
        <div className="mt-3 h-2 rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-forest-700 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h4 className="text-sm font-semibold text-gray-900">D&eacute;tail des r&eacute;ponses</h4>
        </div>
        <div className="divide-y divide-gray-50">
          {questions.map((q, idx) => {
            const resp = responseMap.get(q.code)
            const hasResponse = !!resp
            return (
              <div key={q.id ?? idx} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{q.code}</span>
                      <span className={`inline-block h-2 w-2 rounded-full ${hasResponse ? 'bg-green-500' : 'bg-gray-300'}`} />
                    </div>
                    <p className="mt-1 text-sm text-gray-900">{q.text}</p>
                  </div>
                  <Badge
                    label={hasResponse ? 'R\u00e9pondu' : 'En attente'}
                    variant={hasResponse ? 'green' : 'gray'}
                  />
                </div>
                {hasResponse && resp.response && (
                  <div className="mt-2 rounded bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {formatResponse(resp.response)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function formatResponse(response: Record<string, unknown>): string {
  if (typeof response === 'string') return response
  if ('value' in response) {
    const val = response.value
    if (typeof val === 'boolean') return val ? 'Oui' : 'Non'
    if (Array.isArray(val)) return val.join(', ')
    return String(val)
  }
  return JSON.stringify(response)
}
