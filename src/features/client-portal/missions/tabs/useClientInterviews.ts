import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export interface ClientInterview {
  id: string
  title: string
  date_label: string
  auditor_name: string
  status: string
  // Phase C : remplace controlCodes par les noms des sujets couverts.
  // Le champ garde son nom pour minimiser le churn cote consommateur.
  controlCodes: string[]
}

interface UseClientInterviewsReturn {
  interviews: ClientInterview[]
  loading: boolean
}

export function useClientInterviews(missionId: string): UseClientInterviewsReturn {
  const [interviews, setInterviews] = useState<ClientInterview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) { setLoading(false); return }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = { 'apikey': apikey, 'Authorization': `Bearer ${token}` }

      const res = await fetch(
        `${baseUrl}/rest/v1/interview_schedules?mission_id=eq.${missionId}&select=id,title,scheduled_date,scheduled_time,location,status,auditor_id&order=scheduled_date`,
        { headers }
      )

      if (!res.ok) { setLoading(false); return }
      const data = await res.json() as Record<string, unknown>[]

      // Fetch auditor names
      const auditorIds = [...new Set(data.map((d) => d.auditor_id as string).filter(Boolean))]
      let auditorMap: Record<string, string> = {}
      if (auditorIds.length > 0) {
        const audRes = await fetch(
          `${baseUrl}/rest/v1/users?id=in.(${auditorIds.join(',')})&select=id,first_name,last_name`,
          { headers }
        )
        if (audRes.ok) {
          const auditors = await audRes.json() as { id: string; first_name: string; last_name: string }[]
          auditorMap = Object.fromEntries(auditors.map((a) => [a.id, `${a.first_name} ${a.last_name}`]))
        }
      }

      // Fetch interview_topics → audit_topics name (replaces control_ids)
      const interviewIds = data.map((d) => d.id as string).filter(Boolean)
      const topicsByInterview = new Map<string, string[]>()
      if (interviewIds.length > 0) {
        const linksRes = await fetch(
          `${baseUrl}/rest/v1/interview_topics?interview_id=in.(${interviewIds.join(',')})&select=interview_id,topic_id`,
          { headers }
        )
        if (linksRes.ok) {
          const links = await linksRes.json() as { interview_id: string; topic_id: string }[]
          const allTopicIds = [...new Set(links.map((l) => l.topic_id))]
          let topicNameMap: Record<string, string> = {}
          if (allTopicIds.length > 0) {
            const tRes = await fetch(
              `${baseUrl}/rest/v1/audit_topics?id=in.(${allTopicIds.join(',')})&select=id,name`,
              { headers }
            )
            if (tRes.ok) {
              const tRows = await tRes.json() as { id: string; name: string }[]
              topicNameMap = Object.fromEntries(tRows.map((t) => [t.id, t.name]))
            }
          }
          for (const link of links) {
            const list = topicsByInterview.get(link.interview_id) ?? []
            if (topicNameMap[link.topic_id]) list.push(topicNameMap[link.topic_id])
            topicsByInterview.set(link.interview_id, list)
          }
        }
      }

      const mapped: ClientInterview[] = data.map((d) => {
        const date = d.scheduled_date as string | null
        const time = d.scheduled_time as string | null
        const dateLabel = date
          ? `${new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}${time ? ` à ${time}` : ''}`
          : 'Date à définir'

        return {
          id: d.id as string,
          title: (d.title as string) ?? 'Entretien',
          date_label: dateLabel,
          auditor_name: auditorMap[d.auditor_id as string] ?? 'Auditeur',
          status: (d.status as string) ?? 'scheduled',
          controlCodes: topicsByInterview.get(d.id as string) ?? [],
        }
      })

      setInterviews(mapped)
      setLoading(false)
    }

    fetchData()
  }, [missionId])

  return { interviews, loading }
}
