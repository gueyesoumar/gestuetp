import { ValidationKanbanCard } from './ValidationKanbanCard'
import type { ReviewAssessment } from '../useReviewAssessments'

interface ValidationKanbanColumnProps {
  title: string
  color: string
  assessments: ReviewAssessment[]
  onCardClick: (assessment: ReviewAssessment) => void
}

export function ValidationKanbanColumn({ title, color, assessments, onCardClick }: ValidationKanbanColumnProps){
  return (
    <div className="bg-white border border-gray-200 rounded-xl flex flex-col min-h-0">
      <div className="px-3.5 py-3 border-b border-gray-200 flex items-center justify-between" style={{ borderTop: `3px solid ${color}`, borderRadius: '12px 12px 0 0' }}>
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{assessments.length}</span>
      </div>
      <div className="flex-1 p-2 overflow-y-auto space-y-2">
        {assessments.length === 0 ? (
          <p className="text-[11px] text-gray-300 text-center py-6">Aucun contr&ocirc;le</p>
        ) : (
          assessments.map((a) => (
            <ValidationKanbanCard key={a.id} assessment={a} onClick={() => onCardClick(a)} />
          ))
        )}
      </div>
    </div>
  )
}
