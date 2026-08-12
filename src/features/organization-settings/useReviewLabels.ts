import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useVocab } from '../edition/useVocab'

/**
 * Libellés des deux niveaux de revue (chef / associé) pour le cabinet courant.
 *
 * Source consolidée (RFC 0002) : le vocabulaire par org (`organization_vocab`,
 * clés `lead_term` / `associate_term`), résolu par useVocab. L'ancien couple de
 * colonnes `organizations.review_lead_label/associate_label` a été migré dans le
 * vocab (mig 00174) et n'est plus lu QUE dans le cas override (admin regardant un
 * autre cabinet), en repli.
 *
 *   const { lead, associate } = useReviewLabels()
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
  const vocab = useVocab()
  const isOverride = !!cabinetIdOverride && cabinetIdOverride !== profile?.organization_id
  const [override, setOverride] = useState<ReviewLabels | null>(null)

  useEffect(() => {
    if (!isOverride || !cabinetIdOverride) { setOverride(null); return }
    const abort = new AbortController()
    void (async () => {
      // Cas admin : vocab d'une AUTRE org non résoluble côté client -> repli sur
      // les colonnes (dépréciées mais conservées).
      const { data } = await supabase
        .from('organizations')
        .select('review_lead_label, review_associate_label')
        .eq('id', cabinetIdOverride)
        .abortSignal(abort.signal)
        .maybeSingle()
      if (abort.signal.aborted) return
      const o = data as { review_lead_label: string | null; review_associate_label: string | null } | null
      setOverride({
        lead: o?.review_lead_label?.trim() || DEFAULT_LEAD_LABEL,
        associate: o?.review_associate_label?.trim() || DEFAULT_ASSOCIATE_LABEL,
        loading: false,
      })
    })()
    return () => abort.abort()
  }, [isOverride, cabinetIdOverride])

  if (isOverride) {
    return override ?? { lead: DEFAULT_LEAD_LABEL, associate: DEFAULT_ASSOCIATE_LABEL, loading: true }
  }
  return { lead: vocab.leadTerm, associate: vocab.associateTerm, loading: false }
}
