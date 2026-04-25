import { useState, useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

interface Deadline {
  id: string
  label: string
  date: string
  dateFormatted: string
  type: 'interview' | 'milestone'
  isNext: boolean
}

interface ClientUpcomingDeadlinesProps {
  missionId: string
  endDate: string | null
  status: string
}

const PHASE_MILESTONES: Record<string, string> = {
  fieldwork: 'Fin des travaux terrain',
  internal_review: 'D\u00e9but revue interne',
  client_review: 'Validation client',
  closure: 'Restitution finale',
}

export function ClientUpcomingDeadlines({ missionId, endDate, status }: ClientUpcomingDeadlinesProps): JSX.Element {
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const fetchDeadlines = async (): Promise<void> => {
      setLoading(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) { setLoading(false); return }

      const today = new Date().toISOString().split('T')[0]
      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Fetch upcoming interviews
      const res = await fetch(
        `${baseUrl}/rest/v1/interview_schedules?mission_id=eq.${missionId}&status=eq.scheduled&scheduled_date=gte.${today}&select=id,title,scheduled_date&order=scheduled_date&limit=4`,
        {
          headers: { 'apikey': apikey, 'Authorization': `Bearer ${token}` },
          signal: controller.signal,
        }
      )

      if (controller.signal.aborted) return

      const items: Deadline[] = []

      if (res.ok) {
        const interviews = await res.json() as { id: string; title: string; scheduled_date: string }[]
        for (const iv of interviews) {
          items.push({
            id: iv.id,
            label: iv.title,
            date: iv.scheduled_date,
            dateFormatted: formatDate(iv.scheduled_date),
            type: 'interview',
            isNext: false,
          })
        }
      }

      // Add end date milestone
      if (endDate && endDate >= today) {
        items.push({
          id: 'end-date',
          label: 'Fin de mission',
          date: endDate,
          dateFormatted: formatDate(endDate),
          type: 'milestone',
          isNext: false,
        })
      }

      // Sort by date
      items.sort((a, b) => a.date.localeCompare(b.date))

      // Mark first as "next"
      if (items.length > 0) items[0].isNext = true

      setDeadlines(items.slice(0, 5))
      setLoading(false)
    }

    fetchDeadlines()
    return () => controller.abort()
  }, [missionId, endDate, status])

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={15} className="text-gray-400" />
        <span className="text-[13px] font-semibold text-gray-700">Prochaines {'\u00e9'}ch{'\u00e9'}ances</span>
      </div>
      {loading ? (
        <p className="text-xs text-gray-300 text-center py-4">Chargement...</p>
      ) : deadlines.length === 0 ? (
        <p className="text-xs text-gray-300 text-center py-4">Aucune {'\u00e9'}ch{'\u00e9'}ance {'\u00e0'} venir</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {deadlines.map((d) => (
            <div
              key={d.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg ${
                d.isNext
                  ? 'bg-forest-50 border border-forest-100'
                  : 'bg-white border border-gray-100'
              }`}
            >
              <span className={`text-[11px] font-bold min-w-[50px] ${
                d.isNext ? 'text-forest-700' : 'text-gray-400'
              }`}>
                {d.dateFormatted}
              </span>
              <span className={`text-[12px] flex-1 ${
                d.isNext ? 'text-gray-900 font-medium' : 'text-gray-600'
              }`}>
                {d.label}
              </span>
              {d.type === 'interview' && (
                <span className="text-[9px] font-medium text-forest-700 bg-forest-100 px-1.5 py-0.5 rounded-full">Entretien</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
