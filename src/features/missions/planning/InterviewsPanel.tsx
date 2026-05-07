import { useMemo } from 'react'
import { LayoutGrid } from 'lucide-react'
import { InterviewCard } from './InterviewCard'
import { EmptyState } from '../../../components/ui/EmptyState'
import type { ClientContact, InterviewStatus } from '../../../types/database.types'
import type { AuditTopicWithControls } from './useAuditTopics'
import type { InterviewWithRelations } from './usePlanningData'

interface InterviewsPanelProps {
  interviews: InterviewWithRelations[]
  contacts: ClientContact[]
  topics: AuditTopicWithControls[]
  onAdd: () => void
  onEdit: (interview: InterviewWithRelations) => void
  onStatusChange: (id: string, status: InterviewStatus) => void
  onDelete: (id: string) => void
  onOpenMatrix: () => void
  saving: boolean
}

export function InterviewsPanel({ interviews, contacts, topics, onAdd, onEdit, onStatusChange, onDelete, onOpenMatrix, saving }: InterviewsPanelProps) {
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts])
  const topicLabels = useMemo(() => new Map(topics.map((t) => [t.id, t.name])), [topics])

  const weeks = useMemo(() => {
    const grouped = new Map<string, InterviewWithRelations[]>()
    for (const iv of interviews) {
      const d = new Date(iv.scheduled_date)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay() + 1)
      const key = weekStart.toISOString().slice(0, 10)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push(iv)
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [interviews])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200">
        <span className="text-[13px] font-semibold text-gray-900">Calendrier des entretiens</span>
        <div className="flex gap-2">
          <button onClick={onOpenMatrix}
            className="text-xs font-semibold text-white bg-forest-700 hover:bg-forest-900 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
            <LayoutGrid size={13} /> Matrice acteurs &times; sujets
          </button>
          <button onClick={onAdd} className="text-xs font-semibold text-forest-700 bg-forest-50 border border-forest-300 px-3 py-1.5 rounded-lg hover:bg-forest-100 transition-colors">
            + Manuel
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {interviews.length === 0 ? (
          <EmptyState
            title="Aucun entretien planifi&eacute;"
            description="Planifiez les entretiens avec les interlocuteurs client."
            action={
              <button onClick={onAdd} className="text-xs font-semibold text-forest-700 bg-forest-50 border border-forest-300 px-3 py-1.5 rounded-lg hover:bg-forest-100">
                + Cr&eacute;er le premier entretien
              </button>
            }
          />
        ) : (
          weeks.map(([weekKey, weekInterviews]) => {
            const weekDate = new Date(weekKey)
            const weekEnd = new Date(weekDate)
            weekEnd.setDate(weekDate.getDate() + 4)
            const label = `Semaine du ${weekDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`

            return (
              <div key={weekKey} className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2 pb-1.5 border-b border-gray-200">{label}</p>
                {weekInterviews.map((iv) => (
                  <InterviewCard key={iv.id} interview={iv}
                    actors={iv.actor_ids.map((aid) => contactMap.get(aid)).filter((a): a is ClientContact => Boolean(a))}
                    topicLabels={topicLabels}
                    onEdit={onEdit} onStatusChange={onStatusChange} onDelete={onDelete} saving={saving} />
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
