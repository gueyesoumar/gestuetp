import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export type FeatureCategory = 'ai' | 'reporting' | 'branding' | 'security' | 'collab' | 'general'
export type FeatureMaturity = 'stable' | 'beta' | 'new'

export interface FeatureFlag {
  id: string
  slug: string
  name: string
  description: string | null
  category: FeatureCategory
  maturity: FeatureMaturity
  icon_name: string | null
  is_globally_enabled: boolean
  updated_at: string
}

interface Result {
  flags: FeatureFlag[]
  loading: boolean
  error: string | null
  toggle: (slug: string, enabled: boolean, reason: string) => Promise<boolean>
  refetch: () => void
}

export function useFeatureFlags(): Result {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError(null)
    void supabase
      .from('feature_flags')
      .select('id, slug, name, description, category, maturity, icon_name, is_globally_enabled, updated_at')
      .order('name')
      .abortSignal(abort.signal)
      .then(({ data, error: queryError }) => {
        if (abort.signal.aborted) return
        if (queryError) {
          console.error('useFeatureFlags:', queryError.message)
          setError('Chargement impossible')
        } else {
          setFlags((data ?? []) as FeatureFlag[])
        }
        setLoading(false)
      })
    return () => abort.abort()
  }, [tick])

  const toggle = useCallback(async (slug: string, enabled: boolean, reason: string): Promise<boolean> => {
    const { data, error: fnError } = await supabase.functions.invoke('admin-feature-flags', {
      body: { action: 'toggle', slug, enabled, reason },
    })
    if (fnError) {
      console.error('useFeatureFlags toggle:', fnError.message)
      return false
    }
    if (data?.error) {
      console.error('useFeatureFlags toggle:', data.error)
      return false
    }
    // Le kill switch global affecte tous les cabinets : purger toutes les entrées ff:* du cache.
    try {
      const keys: string[] = []
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const k = sessionStorage.key(i)
        if (k && k.startsWith('ff:')) keys.push(k)
      }
      keys.forEach((k) => sessionStorage.removeItem(k))
    } catch {
      // sessionStorage indisponible — ignorer
    }
    setTick((t) => t + 1)
    return true
  }, [])

  return { flags, loading, error, toggle, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
