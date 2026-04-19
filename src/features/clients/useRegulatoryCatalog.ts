import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { RegulatoryCatalogItem } from '../../types/database.types'

interface UseRegulatoryCatalogResult {
  items: RegulatoryCatalogItem[]
  loading: boolean
  error: string | null
}

export function useRegulatoryCatalog(): UseRegulatoryCatalogResult {
  const [items, setItems] = useState<RegulatoryCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const abortController = new AbortController()

    supabase
      .from('regulatory_catalog')
      .select('*')
      .order('jurisdiction')
      .order('name')
      .abortSignal(abortController.signal)
      .then(({ data, error: queryError }) => {
        if (abortController.signal.aborted) return
        if (queryError) {
          console.error('useRegulatoryCatalog:', queryError.message)
          setError('Impossible de charger le catalogue réglementaire.')
        } else {
          setItems((data ?? []) as unknown as RegulatoryCatalogItem[])
        }
        setLoading(false)
      })

    return () => abortController.abort()
  }, [])

  return { items, loading, error }
}
