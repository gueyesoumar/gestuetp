import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Framework, Domain, Control } from '../../types/database.types'

export interface DomainWithControls extends Domain {
  controls: Control[]
}

interface UseFrameworkDetailResult {
  framework: Framework | null
  domains: DomainWithControls[]
  loading: boolean
  error: string | null
}

export function useFrameworkDetail(slug: string | undefined): UseFrameworkDetailResult {
  const [framework, setFramework] = useState<Framework | null>(null)
  const [domains, setDomains] = useState<DomainWithControls[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    const fetchData = async () => {
      // 1. Charger le referentiel
      const { data: fw, error: fwError } = await supabase
        .from('frameworks')
        .select('*')
        .eq('slug', slug)
        .abortSignal(abortController.signal)
        .single()

      if (abortController.signal.aborted) return
      if (fwError || !fw) {
        console.error('useFrameworkDetail framework:', fwError?.message)
        setError('R\u00e9f\u00e9rentiel introuvable.')
        setLoading(false)
        return
      }

      setFramework(fw)

      // 2. Charger les domaines avec leurs controles
      const { data: domainsData, error: domError } = await supabase
        .from('domains')
        .select('*, controls(*)')
        .eq('framework_id', fw.id)
        .order('sort_order')
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return
      if (domError) {
        console.error('useFrameworkDetail domains:', domError.message)
        setError('Impossible de charger les domaines.')
        setLoading(false)
        return
      }

      type DomainRow = { id: string; framework_id: string; code: string; name: string; description: string | null; sort_order: number; controls: Control[] }
      const rows = (domainsData ?? []) as unknown as DomainRow[]
      const mapped = rows.map((d) => ({
        ...d,
        controls: ((d.controls ?? []) as Control[]).sort(
          (a, b) => a.sort_order - b.sort_order
        ),
      })) as unknown as DomainWithControls[]

      setDomains(mapped)
      setLoading(false)
    }

    fetchData()
    return () => abortController.abort()
  }, [slug])

  return { framework, domains, loading, error }
}
