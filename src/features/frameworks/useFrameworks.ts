import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Framework } from '../../types/database.types'

interface UseFrameworksResult {
  frameworks: Framework[]
  loading: boolean
  error: string | null
}

export function useFrameworks(): UseFrameworksResult {
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()

    supabase
      .from('frameworks')
      .select('*')
      .order('name')
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useFrameworks:', queryError.message)
          setError('Impossible de charger les r\u00e9f\u00e9rentiels.')
        } else {
          setFrameworks(data ?? [])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [])

  return { frameworks, loading, error }
}
