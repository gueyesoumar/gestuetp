import type { InterviewWithRelations } from './usePlanningData'
import type { AuditTopicWithControls } from './useAuditTopics'

interface PlanningNextInterviewProps {
  interviews: InterviewWithRelations[]
  topics: AuditTopicWithControls[]
}

export function PlanningNextInterview({ interviews, topics }: PlanningNextInterviewProps) {
  const topicLabels = new Map(topics.map((t) => [t.id, t.name]))
  const upcoming = interviews
    .filter((i) => i.status === 'scheduled' && i.scheduled_date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0]

  if (!upcoming) return null

  const d = new Date(upcoming.scheduled_date)
  const day = d.getDate()
  const month = d.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase()

  return (
    <div className="p-4 border-b border-gray-200">
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-3">Prochain entretien</h4>
      <div className="flex items-start gap-3">
        <div className="w-11 text-center bg-forest-50 rounded-md py-1 px-1.5 shrink-0">
          <p className="text-base font-bold text-forest-700 leading-none">{day}</p>
          <p className="text-[9px] font-medium text-forest-500 uppercase">{month}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">{upcoming.title}</p>
          <p className="text-[10px] text-gray-300 mt-0.5">
            {upcoming.scheduled_time.slice(0, 5)} &middot; {upcoming.duration_minutes}min
            {upcoming.location && <> &middot; {upcoming.location}</>}
          </p>
          {upcoming.topic_ids.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {upcoming.topic_ids.slice(0, 3).map((id) => (
                <span key={id} className="text-[9px] px-1.5 py-0.5 rounded bg-gold-50 text-gold-700 border border-gold-200">
                  {topicLabels.get(id) ?? id.slice(0, 8)}
                </span>
              ))}
              {upcoming.topic_ids.length > 3 && <span className="text-[9px] text-gray-300">+{upcoming.topic_ids.length - 3}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
