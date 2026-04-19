import type { ReviewAssessment } from '../useReviewAssessments'

interface ValidationKanbanCardProps {
  assessment: ReviewAssessment
  onClick: () => void
}

export function ValidationKanbanCard({ assessment, onClick }: ValidationKanbanCardProps){
  const initials = `${assessment.auditor.first_name[0]}${assessment.auditor.last_name[0]}`
  const timeAgo = formatTimeAgo(assessment.updated_at)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#FAFAF8] border border-gray-200 rounded-lg px-3 py-2.5 hover:border-forest-300 hover:shadow-sm transition-all"
    >
      <p className="text-[11px] font-mono font-medium text-forest-700">{assessment.control.code}</p>
      <p className="text-xs text-gray-700 mt-0.5 leading-snug line-clamp-2">{assessment.control.name}</p>
      <div className="flex items-center justify-between mt-2">
        <div className="w-5 h-5 rounded-full bg-gray-400 text-white flex items-center justify-center text-[9px] font-semibold">
          {initials}
        </div>
        <span className="text-[10px] text-gray-300">{timeAgo}</span>
      </div>
    </button>
  )
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Il y a < 1h'
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `Il y a ${days}j`
}
