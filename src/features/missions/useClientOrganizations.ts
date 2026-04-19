import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Organization } from '../../types/database.types'

interface UseClientOrganizationsResult {
  clients: Organization[]
  loading: boolean
  error: string | null
}

export function useClientOrganizations(): UseClientOrganizationsResult {
  const [clients, setClients] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()

    supabase
      .from('organizations')
      .select('*')
      .contains('types', ['client'])
      .order('name')
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useClientOrganizations:', queryError.message)
          setError('Impossible de charger les clients.')
        } else {
          setClients(data ?? [])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [])

  return { clients, loading, error }
}
