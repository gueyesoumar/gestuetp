import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction'
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

interface AdminFeatureFlagsResponse { success?: boolean; flag_id?: string; slug?: string }

async function call(body: Record<string, unknown>): Promise<CrudResult> {
  const res = await invokeEdgeFunction<AdminFeatureFlagsResponse>('admin-feature-flags', body)
  if (!res.ok) return { ok: false, error: res.error }
  if (!res.data?.success) return { ok: false, error: 'Réponse inattendue' }
  return { ok: true, flag_id: res.data.flag_id, slug: res.data.slug }
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
