import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Control, ControlMappingRelationship } from '../../types/database.types'

export interface MappingRow {
  sourceControl: Control
  targetControl: Control
  relationship: ControlMappingRelationship
  notes: string | null
}

interface UseFrameworkComparisonResult {
  mappings: MappingRow[]
  loading: boolean
  error: string | null
}

export function useFrameworkComparison(
  sourceFrameworkId: string | null,
  targetFrameworkId: string | null
): UseFrameworkComparisonResult {
  const [mappings, setMappings] = useState<MappingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sourceFrameworkId || !targetFrameworkId || sourceFrameworkId === targetFrameworkId) {
      setMappings([])
      setLoading(false)
      return
    }

    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    const fetchMappings = async () => {
      // Charger les controles des deux referentiels
      const [sourceRes, targetRes] = await Promise.all([
        supabase
          .from('controls')
          .select('*, domains!inner(framework_id)')
          .eq('domains.framework_id', sourceFrameworkId)
          .abortSignal(abortController.signal),
        supabase
          .from('controls')
          .select('*, domains!inner(framework_id)')
          .eq('domains.framework_id', targetFrameworkId)
          .abortSignal(abortController.signal),
      ])

      if (abortController.signal.aborted) return

      if (sourceRes.error || targetRes.error) {
        console.error('useFrameworkComparison controls:', sourceRes.error?.message, targetRes.error?.message)
        setError('Impossible de charger les contr\u00f4les.')
        setLoading(false)
        return
      }

      type CtrlRow = { id: string; code: string; name: string; description: string | null; guidance: string | null; domain_id: string; sort_order: number }
      const sourceControls = (sourceRes.data ?? []) as unknown as CtrlRow[]
      const targetControls = (targetRes.data ?? []) as unknown as CtrlRow[]
      const sourceIds = sourceControls.map((c) => c.id)
      const targetIds = targetControls.map((c) => c.id)

      if (sourceIds.length === 0 || targetIds.length === 0) {
        setMappings([])
        setLoading(false)
        return
      }

      // Charger les correspondances
      const { data: mappingsData, error: mapError } = await supabase
        .from('control_mappings')
        .select('*')
        .in('source_control_id', sourceIds)
        .in('target_control_id', targetIds)
        .abortSignal(abortController.signal)

      if (abortController.signal.aborted) return

      if (mapError) {
        console.error('useFrameworkComparison mappings:', mapError.message)
        setError('Impossible de charger les correspondances.')
        setLoading(false)
        return
      }

      const sourceMap = new Map(sourceControls.map((c) => [c.id, c]))
      const targetMap = new Map(targetControls.map((c) => [c.id, c]))

      const rows: MappingRow[] = (mappingsData ?? [])
        .map((m) => {
          const src = sourceMap.get(m.source_control_id)
          const tgt = targetMap.get(m.target_control_id)
          if (!src || !tgt) return null
          return {
            sourceControl: src,
            targetControl: tgt,
            relationship: m.relationship as ControlMappingRelationship,
            notes: m.notes,
          }
        })
        .filter((r): r is MappingRow => r !== null)
        .sort((a, b) => a.sourceControl.code.localeCompare(b.sourceControl.code))

      setMappings(rows)
      setLoading(false)
    }

    fetchMappings()
    return () => abortController.abort()
  }, [sourceFrameworkId, targetFrameworkId])

  return { mappings, loading, error }
}
