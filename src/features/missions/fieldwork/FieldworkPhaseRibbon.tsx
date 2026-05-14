import type { MissionDetail } from '../useMissionDetail'

const PHASE_LABELS: Record<string, string> = {
  draft: 'Phase 0 · Préparation',
  scoping: 'Phase 2 · Cadrage',
  fieldwork: 'Phase 4 · Travaux terrain',
  internal_review: 'Phase 5 · Revue interne',
  client_review: 'Phase 6 · Revue client',
  closed: 'Phase 7 · Clôturée',
}

interface FieldworkPhaseRibbonProps {
  mission: MissionDetail
  scopedTotal: number
  scopedDone: number
}

export function FieldworkPhaseRibbon({ mission, scopedTotal, scopedDone }: FieldworkPhaseRibbonProps) {
  const pct = scopedTotal > 0 ? Math.round((scopedDone / scopedTotal) * 100) : 0
  const phaseLabel = PHASE_LABELS[mission.status] ?? mission.status

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 mb-3 bg-[#FAFAF8] border border-gray-200 rounded-xl">
      <h2 className="text-sm font-bold text-gray-900 truncate min-w-0">
        {mission.name}
        {mission.client?.name && (
          <span className="font-normal text-gray-500"> &mdash; {mission.client.name}</span>
        )}
      </h2>
      <span className="text-xs text-gray-500 shrink-0">{phaseLabel}</span>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        <span className="text-[11px] text-gray-500">Mes contr&ocirc;les</span>
        <div className="w-28 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-forest-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-[11px] font-semibold text-gray-900">
          {scopedDone}/{scopedTotal}
        </span>
      </div>
    </div>
  )
}
