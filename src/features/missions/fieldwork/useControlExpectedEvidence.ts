import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { EvidenceKind } from '../../../types/database.types'

export interface ExpectedEvidence {
  id: string
  evidenceItemId: string | null
  name: string
  description: string | null
  isRequired: boolean
  kind: EvidenceKind
  /** Une preuve mutualisée est fournie dès qu'un document de la mission la référence. */
  fulfilled: boolean
  fulfilledFileName: string | null
  /** Nombre de contrôles partageant cette preuve canonique (>1 = mutualisée). */
  sharedControlCount: number
}

interface UseControlExpectedEvidenceResult {
  items: ExpectedEvidence[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Preuves attendues d'un contrôle (evidence_catalog) avec leur couverture
 * (documents portant le même evidence_item_id dans la mission) et leur degré de
 * mutualisation (nombre de contrôles partageant la preuve canonique).
 */
export function useControlExpectedEvidence(missionId: string | undefined, controlId: string | undefined): UseControlExpectedEvidenceResult {
  const [items, setItems] = useState<ExpectedEvidence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const refetch = useCallback(() => setRefreshKey((k) => k + 1), [])

  useEffect(() => {
    if (!missionId || !controlId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    setError(null)

    const run = async (): Promise<void> => {
      const { data: cat, error: catErr } = await supabase
        .from('evidence_catalog')
        .select('id,name,description,is_required,kind,evidence_item_id')
        .eq('control_id', controlId)
        .order('sort_order')
        .abortSignal(ac.signal)
      if (catErr) {
        if (!ac.signal.aborted) { console.error('expected evidence:', catErr.message); setError('Impossible de charger les preuves attendues.'); setLoading(false) }
        return
      }
      const rows = cat ?? []
      const itemIds = [...new Set(rows.map((r) => r.evidence_item_id).filter((x): x is string => !!x))]

      const fulfilled = new Map<string, string>()
      const shared = new Map<string, number>()
      if (itemIds.length > 0) {
        const { data: docs } = await supabase
          .from('documents')
          .select('evidence_item_id,file_name')
          .eq('mission_id', missionId)
          .in('evidence_item_id', itemIds)
          .abortSignal(ac.signal)
        for (const d of docs ?? []) if (d.evidence_item_id) fulfilled.set(d.evidence_item_id, d.file_name)

        const { data: links } = await supabase
          .from('evidence_catalog')
          .select('evidence_item_id,control_id')
          .in('evidence_item_id', itemIds)
          .abortSignal(ac.signal)
        const byItem: Record<string, Set<string>> = {}
        for (const l of links ?? []) if (l.evidence_item_id) (byItem[l.evidence_item_id] = byItem[l.evidence_item_id] ?? new Set()).add(l.control_id)
        for (const [k, s] of Object.entries(byItem)) shared.set(k, s.size)
      }

      if (ac.signal.aborted) return
      setItems(rows.map((r) => ({
        id: r.id,
        evidenceItemId: r.evidence_item_id,
        name: r.name,
        description: r.description,
        isRequired: r.is_required,
        kind: r.kind,
        fulfilled: r.evidence_item_id ? fulfilled.has(r.evidence_item_id) : false,
        fulfilledFileName: r.evidence_item_id ? (fulfilled.get(r.evidence_item_id) ?? null) : null,
        sharedControlCount: r.evidence_item_id ? (shared.get(r.evidence_item_id) ?? 1) : 1,
      })))
      setLoading(false)
    }

    run().catch(() => { if (!ac.signal.aborted) setLoading(false) })
    return () => ac.abort()
  }, [missionId, controlId, refreshKey])

  return { items, loading, error, refetch }
}
