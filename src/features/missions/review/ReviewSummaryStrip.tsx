import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

interface Summary {
  sourceName: string
  unchanged: number
  modified: number
  pending: number
}

/** Bandeau de revue (n°18 Lot 3c) : sur une mission de revue, rappelle la mission
 *  source et le décompte des contrôles tranchés (inchangés / modifiés / à trancher).
 *  Rend null hors mission de revue. Lecture bornée par les RLS existantes. */
export function ReviewSummaryStrip({ missionId }: { missionId: string }): JSX.Element | null {
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    const ac = new AbortController()
    const load = async (): Promise<void> => {
      const { data: m } = await supabase
        .from('missions').select('review_of_mission_id').eq('id', missionId).abortSignal(ac.signal).maybeSingle()
      const sourceId = (m as { review_of_mission_id?: string | null } | null)?.review_of_mission_id ?? null
      if (ac.signal.aborted || !sourceId) { setSummary(null); return }

      const [{ data: src }, { data: evals }, { count: scope }] = await Promise.all([
        supabase.from('missions').select('name').eq('id', sourceId).abortSignal(ac.signal).maybeSingle(),
        supabase.from('control_assessments').select('review_delta').eq('mission_id', missionId).abortSignal(ac.signal),
        supabase.from('control_assessments').select('id', { count: 'exact', head: true }).eq('mission_id', missionId).abortSignal(ac.signal),
      ])
      if (ac.signal.aborted) return
      const rows = (evals ?? []) as Array<{ review_delta: string | null }>
      const unchanged = rows.filter((r) => r.review_delta === 'unchanged').length
      const modified = rows.filter((r) => r.review_delta === 'modified').length
      setSummary({
        sourceName: (src as { name?: string } | null)?.name ?? 'Revue précédente',
        unchanged, modified,
        pending: Math.max(0, (scope ?? 0) - unchanged - modified),
      })
    }
    void load()
    return () => ac.abort()
  }, [missionId])

  if (!summary) return null
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-forest-200 bg-forest-50/50 px-7 py-2 text-[12.5px]">
      <span className="inline-flex items-center gap-1.5 font-semibold text-forest-900">
        <History size={14} /> Revue de « {summary.sourceName} »
      </span>
      <span className="text-gray-600"><b className="text-forest-700">{summary.unchanged}</b> sans changement</span>
      <span className="text-gray-600"><b className="text-gold-600">{summary.modified}</b> modifié{summary.modified !== 1 ? 's' : ''}</span>
      <span className="text-gray-600"><b className="text-gray-700">{summary.pending}</b> à trancher</span>
    </div>
  )
}
