import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { Organization } from '../../types/database.types'

interface UseOrganizationResult {
  organization: Organization | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useOrganization(): UseOrganizationResult {
  const { profile } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .abortSignal(abortController.signal)
      .single()
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useOrganization:', queryError.message)
          setError('Impossible de charger l\u2019organisation.')
          setOrganization(null)
        } else {
          setOrganization(data)
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [profile?.organization_id, refreshKey])

  return { organization, loading, error, refetch }
}
