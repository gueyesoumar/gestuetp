import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export type FeatureCategory = 'ai' | 'reporting' | 'branding' | 'security' | 'collab' | 'general'
export type FeatureMaturity = 'stable' | 'beta' | 'new'

export interface FeatureCatalogItem {
  id: string
  slug: string
  name: string
  description: string | null
  category: FeatureCategory
  maturity: FeatureMaturity
  icon_name: string | null
  is_globally_enabled: boolean
}

export interface FeatureCategoryGroup {
  category: FeatureCategory
  label: string
  items: FeatureCatalogItem[]
}

const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  ai: 'IA & Productivité',
  reporting: 'Reporting & Exports',
  branding: 'Marque blanche & Branding',
  security: 'Sécurité & Conformité',
  collab: 'Collaboration',
  general: 'Général',
}

const CATEGORY_ORDER: FeatureCategory[] = ['ai', 'reporting', 'branding', 'collab', 'security', 'general']

interface Result {
  items: FeatureCatalogItem[]
  groups: FeatureCategoryGroup[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useFeatureCatalog(): Result {
  const [items, setItems] = useState<FeatureCatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const { data, error: queryErr } = await supabase
          .from('feature_flags')
          .select('id, slug, name, description, category, maturity, icon_name, is_globally_enabled')
          .order('name', { ascending: true })
          .abortSignal(abort.signal)
        if (abort.signal.aborted) return
        if (queryErr) throw queryErr
        setItems((data ?? []) as FeatureCatalogItem[])
        setLoading(false)
      } catch (err) {
        if (abort.signal.aborted) return
        console.error('useFeatureCatalog:', err)
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
        setLoading(false)
      }
    })()

    return () => abort.abort()
  }, [tick])

  const groups: FeatureCategoryGroup[] = CATEGORY_ORDER
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      items: items.filter((i) => i.category === cat),
    }))
    .filter((g) => g.items.length > 0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  return { items, groups, loading, error, refetch }
}
