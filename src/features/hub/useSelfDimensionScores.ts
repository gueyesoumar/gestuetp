import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { SCORE_DIMENSION_KEYS, SCORE_DIMENSION_KIND, type ScoreDimensionKey } from '../../lib/constants'

// Score de confiance par dimension pour l'organisation courante (Phase B).
// Même périmètre que le score composite actuel (missions du cabinet), mais
// ventilé par dimension via la jointure control_assessments -> controls.dimension.
// 6 axes (moyennés dans le composite) + 2 facteurs. Dégradation gracieuse :
// une dimension sans évaluation reste `null` (non comptée).

export interface DimScore {
  key: ScoreDimensionKey
  score: number | null
  total: number
  approved: number
}

export interface SelfDimensionData {
  loading: boolean
  axes: DimScore[]
  factors: DimScore[]
  composite: number | null
  measuredAxes: number
  totalAxes: number
}

const AXIS_KEYS = SCORE_DIMENSION_KEYS.filter((k) => SCORE_DIMENSION_KIND[k] === 'axis')
const FACTOR_KEYS = SCORE_DIMENSION_KEYS.filter((k) => SCORE_DIMENSION_KIND[k] === 'factor')

const EMPTY: SelfDimensionData = {
  loading: false, axes: [], factors: [], composite: null, measuredAxes: 0, totalAxes: AXIS_KEYS.length,
}

function toDimScore(key: ScoreDimensionKey, agg: { total: number; approved: number } | undefined): DimScore {
  const total = agg?.total ?? 0
  const approved = agg?.approved ?? 0
  return { key, total, approved, score: total > 0 ? Math.round((approved / total) * 100) : null }
}

export function useSelfDimensionScores(): SelfDimensionData {
  const { profile } = useAuth()
  const [data, setData] = useState<SelfDimensionData>({ ...EMPTY, loading: true })

  useEffect(() => {
    const orgId = profile?.organization_id
    if (!orgId) { setData(EMPTY); return }
    const ctrl = new AbortController()

    void (async () => {
      const { data: missions, error: mErr } = await supabase
        .from('missions').select('id').eq('cabinet_id', orgId).eq('is_active', true).abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (mErr) { console.error('dimension scores missions:', mErr.message); setData(EMPTY); return }

      const missionIds = (missions ?? []).map((m: { id: string }) => m.id)
      if (missionIds.length === 0) { setData({ ...EMPTY, axes: AXIS_KEYS.map((k) => toDimScore(k, undefined)), factors: FACTOR_KEYS.map((k) => toDimScore(k, undefined)) }); return }

      const { data: assessments, error: aErr } = await supabase
        .from('control_assessments').select('status, control_id').in('mission_id', missionIds).abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (aErr) { console.error('dimension scores assessments:', aErr.message); setData(EMPTY); return }

      const rows = (assessments ?? []) as Array<{ status: string; control_id: string }>
      const controlIds = [...new Set(rows.map((r) => r.control_id))]
      if (controlIds.length === 0) { setData({ ...EMPTY, axes: AXIS_KEYS.map((k) => toDimScore(k, undefined)), factors: FACTOR_KEYS.map((k) => toDimScore(k, undefined)) }); return }

      const { data: controls, error: cErr } = await supabase
        .from('controls').select('id, dimension').in('id', controlIds).abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (cErr) { console.error('dimension scores controls:', cErr.message); setData(EMPTY); return }

      const dimByControl = new Map<string, ScoreDimensionKey | null>()
      for (const c of (controls ?? []) as Array<{ id: string; dimension: ScoreDimensionKey | null }>) {
        dimByControl.set(c.id, c.dimension)
      }

      const agg = new Map<ScoreDimensionKey, { total: number; approved: number }>()
      for (const r of rows) {
        const dim = dimByControl.get(r.control_id)
        if (!dim) continue
        const cur = agg.get(dim) ?? { total: 0, approved: 0 }
        cur.total += 1
        if (r.status === 'approved') cur.approved += 1
        agg.set(dim, cur)
      }

      const axes = AXIS_KEYS.map((k) => toDimScore(k, agg.get(k)))
      const factors = FACTOR_KEYS.map((k) => toDimScore(k, agg.get(k)))
      const measured = axes.filter((a) => a.score !== null)
      const composite = measured.length > 0
        ? Math.round(measured.reduce((s, a) => s + (a.score ?? 0), 0) / measured.length)
        : null

      setData({ loading: false, axes, factors, composite, measuredAxes: measured.length, totalAxes: AXIS_KEYS.length })
    })()

    return () => ctrl.abort()
  }, [profile?.organization_id])

  return data
}
