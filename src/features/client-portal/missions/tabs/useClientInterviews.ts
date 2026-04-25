import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export interface ClientInterview {
  id: string
  title: string
  date_label: string
  auditor_name: string
  status: string
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
        `${baseUrl}/rest/v1/interview_schedules?mission_id=eq.${missionId}&select=id,title,scheduled_date,scheduled_time,location,status,auditor_id,control_ids&order=scheduled_date`,
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

      // Resolve control_ids \u2192 codes
      const allControlIds = [...new Set(data.flatMap((d) => (d.control_ids as string[]) ?? []))]
      let controlCodeMap: Record<string, string> = {}
      if (allControlIds.length > 0) {
        const ctrlRes = await fetch(
          `${baseUrl}/rest/v1/controls?id=in.(${allControlIds.join(',')})&select=id,code`,
          { headers }
        )
        if (ctrlRes.ok) {
          const ctrls = await ctrlRes.json() as { id: string; code: string }[]
          controlCodeMap = Object.fromEntries(ctrls.map((c) => [c.id, c.code]))
        }
      }

      const mapped: ClientInterview[] = data.map((d) => {
        const date = d.scheduled_date as string | null
        const time = d.scheduled_time as string | null
        const dateLabel = date
          ? `${new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}${time ? ` \u00e0 ${time}` : ''}`
          : 'Date \u00e0 d\u00e9finir'

        const ctrlIds = (d.control_ids as string[]) ?? []
        const controlCodes = ctrlIds.map((id) => controlCodeMap[id]).filter(Boolean)

        return {
          id: d.id as string,
          title: (d.title as string) ?? 'Entretien',
          date_label: dateLabel,
          auditor_name: auditorMap[d.auditor_id as string] ?? 'Auditeur',
          status: (d.status as string) ?? 'scheduled',
          controlCodes,
        }
      })

      setInterviews(mapped)
      setLoading(false)
    }

    fetchData()
  }, [missionId])

  return { interviews, loading }
}
