import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Control } from '../../types/database.types'
import type { DomainWithControls } from '../frameworks/useFrameworkDetail'

interface UseFrameworkDomainsResult {
  domains: DomainWithControls[]
  loading: boolean
}

/**
 * Charge les domaines (avec leurs contrôles) d'un référentiel par ID.
 * Variante de useFrameworkDetail (qui prend un slug) pour le wizard de création
 * de mission, où l'on manipule l'ID du référentiel sélectionné.
 */
export function useFrameworkDomains(frameworkId: string | undefined): UseFrameworkDomainsResult {
  const [domains, setDomains] = useState<DomainWithControls[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!frameworkId) {
      setDomains([])
      return
    }
    const ac = new AbortController()
    setLoading(true)

    supabase
      .from('domains')
      .select('*, controls(*)')
      .eq('framework_id', frameworkId)
      .order('sort_order')
      .abortSignal(ac.signal)
      .then(({ data, error }) => {
        if (ac.signal.aborted) return
        if (error) {
          console.error('useFrameworkDomains:', error.message)
          setDomains([])
          setLoading(false)
          return
        }
        type DomainRow = { id: string; framework_id: string; code: string; name: string; description: string | null; sort_order: number; controls: Control[] }
        const rows = (data ?? []) as unknown as DomainRow[]
        const mapped = rows.map((d) => ({
          ...d,
          controls: ((d.controls ?? []) as Control[]).sort((a, b) => a.sort_order - b.sort_order),
        })) as unknown as DomainWithControls[]
        setDomains(mapped)
        setLoading(false)
      })

    return () => ac.abort()
  }, [frameworkId])

  return { domains, loading }
}
