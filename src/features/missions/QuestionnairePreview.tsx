import { Badge } from '../../components/ui/Badge'
import type { Question } from '../../types/database.types'

interface QuestionnairePreviewProps {
  templateName: string
  questions: Question[]
}

const typeLabels: Record<string, string> = {
  text: 'Texte court',
  textarea: 'Texte long',
  single_choice: 'Choix unique',
  multiple_choice: 'Choix multiple',
  boolean: 'Oui / Non',
  file_upload: 'Fichier',
}

export function QuestionnairePreview({ templateName, questions }: QuestionnairePreviewProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-4">
        <h4 className="text-sm font-semibold text-gray-900">{templateName}</h4>
        <p className="mt-1 text-xs text-gray-500">{questions.length} questions</p>
      </div>
      <div className="divide-y divide-gray-50">
        {questions.map((q, idx) => (
          <div key={q.id ?? idx} className="flex items-start gap-3 px-5 py-3">
            <span className="mt-0.5 text-xs font-mono text-gray-400">{q.code}</span>
            <div className="flex-1">
              <p className="text-sm text-gray-900">{q.text}</p>
              {q.description && (
                <p className="mt-0.5 text-xs text-gray-500">{q.description}</p>
              )}
              {q.options && (q.options as string[]).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {(q.options as string[]).map((opt, i) => (
                    <span key={i} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{opt}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge label={typeLabels[q.question_type] ?? q.question_type} variant="gray" />
              {q.is_required && <Badge label="Requis" variant="red" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
