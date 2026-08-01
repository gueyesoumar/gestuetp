import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

/**
 * Charge les libellés custom des étapes de revue pour le cabinet courant.
 * Tombe sur les défauts Gëstu si pas configurés.
 *
 * Usage :
 *   const { lead, associate, loading } = useReviewLabels()
 *   <h3>Revue {lead.toLowerCase()}</h3>
 *
 * Cache sessionStorage par cabinet pour éviter le refetch entre pages.
 */

export interface ReviewLabels {
  lead: string
  associate: string
  loading: boolean
}

export const DEFAULT_LEAD_LABEL = 'Chef de mission'
export const DEFAULT_ASSOCIATE_LABEL = 'Associé'

export function useReviewLabels(cabinetIdOverride?: string | null): ReviewLabels {
  const { profile } = useAuth()
  const cabinetId = cabinetIdOverride ?? profile?.organization_id ?? null
  const [state, setState] = useState<ReviewLabels>({
    lead: DEFAULT_LEAD_LABEL,
    associate: DEFAULT_ASSOCIATE_LABEL,
    loading: !!cabinetId,
  })

  useEffect(() => {
    if (!cabinetId) {
      setState({ lead: DEFAULT_LEAD_LABEL, associate: DEFAULT_ASSOCIATE_LABEL, loading: false })
      return
    }

    const cacheKey = `reviewLabels:${cabinetId}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as { lead: string; associate: string }
        setState({ lead: parsed.lead, associate: parsed.associate, loading: false })
        return
      } catch {
        // cache corrompu, on refetch
      }
    }

    const abort = new AbortController()
    void (async () => {
      const { data } = await supabase
        .from('organizations')
        .select('review_lead_label, review_associate_label')
        .eq('id', cabinetId)
        .abortSignal(abort.signal)
        .maybeSingle()
      if (abort.signal.aborted) return
      const o = data as { review_lead_label: string | null; review_associate_label: string | null } | null
      const lead = o?.review_lead_label?.trim() || DEFAULT_LEAD_LABEL
      const associate = o?.review_associate_label?.trim() || DEFAULT_ASSOCIATE_LABEL
      sessionStorage.setItem(cacheKey, JSON.stringify({ lead, associate }))
      setState({ lead, associate, loading: false })
    })()
    return () => abort.abort()
  }, [cabinetId])

  return state
}
