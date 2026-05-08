import { supabase } from '../../../lib/supabase'
import type { FeatureCategory, FeatureMaturity } from '../plans/useFeatureCatalog'

export interface FeatureCreateInput {
  name: string
  description: string | null
  category: FeatureCategory
  maturity: FeatureMaturity
  icon_name: string | null
  is_globally_enabled?: boolean
}

export interface FeatureUpdateInput {
  name?: string
  description?: string | null
  category?: FeatureCategory
  maturity?: FeatureMaturity
  icon_name?: string | null
}

interface CrudResult { ok: boolean; error?: string; flag_id?: string; slug?: string }

async function call(body: Record<string, unknown>): Promise<CrudResult> {
  try {
    const { data, error } = await supabase.functions.invoke('admin-feature-flags', { body })
    if (error) return { ok: false, error: error.message }
    const res = data as { success?: boolean; error?: string; flag_id?: string; slug?: string } | null
    if (res?.error) return { ok: false, error: res.error }
    if (!res?.success) return { ok: false, error: 'Réponse inattendue' }
    return { ok: true, flag_id: res.flag_id, slug: res.slug }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' }
  }
}

export function createFeatureFlag(input: FeatureCreateInput, reason: string): Promise<CrudResult> {
  return call({ action: 'create', reason, ...input })
}

export function updateFeatureFlag(flagId: string, input: FeatureUpdateInput, reason: string): Promise<CrudResult> {
  return call({ action: 'update', reason, flag_id: flagId, ...input })
}

export function deleteFeatureFlag(flagId: string, reason: string): Promise<CrudResult> {
  return call({ action: 'delete', reason, flag_id: flagId })
}
