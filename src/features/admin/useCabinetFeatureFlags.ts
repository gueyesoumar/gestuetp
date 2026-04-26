import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface CabinetFlag {
  flag_id: string
  slug: string
  name: string
  description: string | null
  is_globally_enabled: boolean
  /** null = pas d'override (hérite du global). true/false sinon. */
  override_enabled: boolean | null
  override_reason: string | null
  override_updated_at: string | null
}

interface Result {
  flags: CabinetFlag[]
  loading: boolean
  error: string | null
  setOverride: (slug: string, enabled: boolean, reason: string) => Promise<boolean>
  resetOverride: (slug: string, reason: string) => Promise<boolean>
  refetch: () => void
}

/**
 * Charge l'ensemble des feature flags + leur override éventuel pour le cabinet
 * passé en paramètre. Réservé à la console super-admin.
 */
export function useCabinetFeatureFlags(cabinetId: string | undefined): Result {
  const [flags, setFlags] = useState<CabinetFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!cabinetId) {
      setLoading(false)
      return
    }

    const abort = new AbortController()
    setLoading(true)
    setError(null)

    void (async () => {
      const { data: allFlags, error: flagsError } = await supabase
        .from('feature_flags')
        .select('id, slug, name, description, is_globally_enabled')
        .order('slug')
        .abortSignal(abort.signal)

      if (abort.signal.aborted) return
      if (flagsError) {
        setError('Chargement des flags impossible')
        setLoading(false)
        return
      }

      const { data: overrides, error: ovError } = await supabase
        .from('feature_flag_overrides')
        .select('flag_id, enabled, reason, updated_at')
        .eq('organization_id', cabinetId)
        .abortSignal(abort.signal)

      if (abort.signal.aborted) return
      if (ovError) {
        setError('Chargement des overrides impossible')
        setLoading(false)
        return
      }

      const overrideMap = new Map<string, { enabled: boolean; reason: string; updated_at: string }>()
      for (const o of (overrides ?? []) as Array<{ flag_id: string; enabled: boolean; reason: string; updated_at: string }>) {
        overrideMap.set(o.flag_id, { enabled: o.enabled, reason: o.reason, updated_at: o.updated_at })
      }

      const merged: CabinetFlag[] = ((allFlags ?? []) as Array<{ id: string; slug: string; name: string; description: string | null; is_globally_enabled: boolean }>).map((f) => {
        const ov = overrideMap.get(f.id) ?? null
        return {
          flag_id: f.id,
          slug: f.slug,
          name: f.name,
          description: f.description,
          is_globally_enabled: f.is_globally_enabled,
          override_enabled: ov?.enabled ?? null,
          override_reason: ov?.reason ?? null,
          override_updated_at: ov?.updated_at ?? null,
        }
      })

      setFlags(merged)
      setLoading(false)
    })()

    return () => abort.abort()
  }, [cabinetId, tick])

  const setOverride = useCallback(async (slug: string, enabled: boolean, reason: string): Promise<boolean> => {
    if (!cabinetId) return false
    const { data, error: fnError } = await supabase.functions.invoke('admin-feature-flag-overrides', {
      body: { action: 'set', cabinet_id: cabinetId, flag_slug: slug, enabled, reason },
    })
    if (fnError || data?.error) {
      console.error('setOverride:', fnError?.message ?? data?.error)
      return false
    }
    // Invalider le cache du consommateur côté front (si l'admin et le user ciblé partagent l'app)
    sessionStorage.removeItem(`ff:${cabinetId}:${slug}`)
    setTick((t) => t + 1)
    return true
  }, [cabinetId])

  const resetOverride = useCallback(async (slug: string, reason: string): Promise<boolean> => {
    if (!cabinetId) return false
    const { data, error: fnError } = await supabase.functions.invoke('admin-feature-flag-overrides', {
      body: { action: 'reset', cabinet_id: cabinetId, flag_slug: slug, reason },
    })
    if (fnError || data?.error) {
      console.error('resetOverride:', fnError?.message ?? data?.error)
      return false
    }
    sessionStorage.removeItem(`ff:${cabinetId}:${slug}`)
    setTick((t) => t + 1)
    return true
  }, [cabinetId])

  return { flags, loading, error, setOverride, resetOverride, refetch: useCallback(() => setTick((t) => t + 1), []) }
}
