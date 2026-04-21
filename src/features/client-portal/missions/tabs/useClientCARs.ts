import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import type { CorrectiveActionRequest, CARStatus } from '../../../../types/database.types'

interface UseClientCARsResult {
  cars: CorrectiveActionRequest[]
  loading: boolean
  submitResponse: (carId: string, rootCause: string, action: string, targetDate: string) => Promise<boolean>
  submitting: boolean
}

export function useClientCARs(missionId: string): UseClientCARsResult {
  const [cars, setCars] = useState<CorrectiveActionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)

    const fetchCARs = async (): Promise<void> => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) { setLoading(false); return }

      const baseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(
        `${baseUrl}/rest/v1/corrective_action_requests?mission_id=eq.${missionId}&order=created_at.asc`,
        {
          headers: { 'apikey': apikey, 'Authorization': `Bearer ${token}` },
          signal: controller.signal,
        }
      )
      if (controller.signal.aborted) return
      if (res.ok) {
        const data = (await res.json()) as CorrectiveActionRequest[]
        setCars(data)
      } else {
        console.error('useClientCARs: fetch failed', res.status)
      }
      setLoading(false)
    }

    fetchCARs()
    return () => controller.abort()
  }, [missionId])

  const submitResponse = useCallback(async (carId: string, rootCause: string, action: string, targetDate: string): Promise<boolean> => {
    setSubmitting(true)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) { setSubmitting(false); return false }

    const baseUrl = import.meta.env.VITE_SUPABASE_URL
    const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY

    const res = await fetch(`${baseUrl}/rest/v1/corrective_action_requests?id=eq.${carId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apikey,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        client_root_cause: rootCause || null,
        client_action: action || null,
        client_target_date: targetDate || null,
        status: 'client_responded' as CARStatus,
      }),
    })

    if (!res.ok) {
      console.error('submitResponse: PATCH failed', res.status)
      setSubmitting(false)
      return false
    }

    setCars((prev) => prev.map((c) =>
      c.id === carId
        ? { ...c, client_root_cause: rootCause, client_action: action, client_target_date: targetDate, status: 'client_responded' as CARStatus }
        : c
    ))
    setSubmitting(false)
    return true
  }, [])

  return { cars, loading, submitResponse, submitting }
}
