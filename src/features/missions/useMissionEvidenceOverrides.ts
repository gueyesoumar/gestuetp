import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import type { MissionEvidenceOverride } from '../../types/database.types'

interface UseMissionEvidenceOverridesReturn {
  /** Map of evidence_name → override (true = essentielle, false = pas essentielle) */
  overrides: Map<string, boolean>
  /**
   * Returns the effective "essential" flag for a given evidence:
   * - if there's an override → use it
   * - otherwise fall back to the catalog's is_required value
   */
  isEssential: (evidenceName: string, catalogIsRequired: boolean) => boolean
  /** Toggle override on/off for an evidence name */
  toggleOverride: (evidenceName: string, catalogIsRequired: boolean) => Promise<boolean>
  loading: boolean
  saving: boolean
  refetch: () => void
}

export function useMissionEvidenceOverrides(missionId: string | undefined): UseMissionEvidenceOverridesReturn {
  const { profile } = useAuth()
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)

    supabase
      .from('mission_evidence_overrides')
      .select('evidence_name, is_essential')
      .eq('mission_id', missionId)
      .abortSignal(controller.signal)
      .then(({ data, error }) => {
        if (controller.signal.aborted) return
        if (error) {
          console.error('useMissionEvidenceOverrides:', error.message)
          setLoading(false)
          return
        }
        const map = new Map<string, boolean>()
        for (const row of (data ?? []) as Pick<MissionEvidenceOverride, 'evidence_name' | 'is_essential'>[]) {
          map.set(row.evidence_name, row.is_essential)
        }
        setOverrides(map)
        setLoading(false)
      })

    return () => controller.abort()
  }, [missionId, refreshKey])

  const isEssential = useCallback((evidenceName: string, catalogIsRequired: boolean): boolean => {
    const override = overrides.get(evidenceName)
    return override !== undefined ? override : catalogIsRequired
  }, [overrides])

  const toggleOverride = useCallback(async (evidenceName: string, catalogIsRequired: boolean): Promise<boolean> => {
    if (!missionId || !profile?.id) return false
    setSaving(true)

    const currentEffective = isEssential(evidenceName, catalogIsRequired)
    const newValue = !currentEffective

    // If new value matches the catalog default, we can delete the override
    if (newValue === catalogIsRequired) {
      const { error: delErr } = await supabase
        .from('mission_evidence_overrides')
        .delete()
        .eq('mission_id', missionId)
        .eq('evidence_name', evidenceName)

      setSaving(false)
      if (delErr) {
        console.error('toggleOverride delete:', delErr.message)
        return false
      }
      // Optimistic update
      setOverrides((prev) => {
        const next = new Map(prev)
        next.delete(evidenceName)
        return next
      })
      return true
    }

    // Otherwise upsert the override
    const { error: upErr } = await supabase
      .from('mission_evidence_overrides')
      .upsert({
        mission_id: missionId,
        evidence_name: evidenceName,
        is_essential: newValue,
        created_by: profile.id,
      } as never, { onConflict: 'mission_id,evidence_name' })

    setSaving(false)
    if (upErr) {
      console.error('toggleOverride upsert:', upErr.message)
      return false
    }

    // Optimistic update
    setOverrides((prev) => {
      const next = new Map(prev)
      next.set(evidenceName, newValue)
      return next
    })
    return true
  }, [missionId, profile?.id, isEssential])

  return { overrides, isEssential, toggleOverride, loading, saving, refetch }
}
