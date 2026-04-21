import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export interface MemberMission {
  id: string
  role: string
  mission: {
    id: string
    name: string
    status: string
    start_date: string | null
    end_date: string | null
  }
}

interface UseMemberMissionsResult {
  missions: MemberMission[]
  loading: boolean
  error: string | null
}

export function useMemberMissions(userId: string): UseMemberMissionsResult {
  const [missions, setMissions] = useState<MemberMission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    supabase
      .from('mission_members')
      .select('id, role, mission:missions(id, name, status, start_date, end_date)')
      .eq('user_id', userId)
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useMemberMissions:', queryError.message)
          setError('Impossible de charger les missions.')
        } else {
          setMissions((data ?? []) as unknown as MemberMission[])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [userId])

  return { missions, loading, error }
}
