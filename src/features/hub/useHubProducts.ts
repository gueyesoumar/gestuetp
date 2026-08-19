import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { HubProduct } from '../../lib/hubProducts'

interface HubProductsState {
  products: HubProduct[]
  loading: boolean
}

/**
 * Catalogue produits du Hub (RFC 0006, couche ① — table `products`, migration 00198).
 * Remplace le tableau HUB_PRODUCTS en dur. L'état `active` de base vient de
 * `active_default` ; la surcharge dynamique (souscription Risk/Policy) et les stats
 * live restent calculées par l'appelant (OrbitCockpit).
 */
export function useHubProducts(): HubProductsState {
  const [products, setProducts] = useState<HubProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    void (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('name, title, description, accent_color, badge, active_default, sort_order')
        .order('sort_order', { ascending: true })
        .abortSignal(controller.signal)
      if (!active) return
      if (error) {
        console.error('useHubProducts:', error.message)
        setProducts([])
        setLoading(false)
        return
      }
      setProducts(
        (data ?? []).map((p) => ({
          name: p.name,
          title: p.title,
          description: p.description,
          color: p.accent_color,
          active: p.active_default,
          badge: p.badge,
          stats: [],
        })),
      )
      setLoading(false)
    })()
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  return { products, loading }
}
