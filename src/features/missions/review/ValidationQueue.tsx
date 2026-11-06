import { Badge } from '../../../components/ui/Badge'
import { ASSESSMENT_STATUS_CONFIG } from '../mission-constants'
import { CLASSIFICATION_OPTIONS } from '../fieldwork/findings/FindingPickers'
import { isActionable, type DomainGroup, type ReviewStage } from './reviewQueue'
import type { ReviewAssessment } from '../useReviewAssessments'

interface ValidationQueueProps {
  groups: DomainGroup[]
  stage: ReviewStage
  selected: Set<string>
  busy: boolean
  onToggle: (id: string) => void
  onToggleDomain: (group: DomainGroup) => void
  onOpen: (assessment: ReviewAssessment) => void
}

function classificationPill(a: ReviewAssessment): JSX.Element | null {
  if (!a.topClassification) return null
  const cfg = CLASSIFICATION_OPTIONS.find((c) => c.value === a.topClassification)
  if (!cfg) return null
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.pillBg}`}>{cfg.label}</span>
}

export function ValidationQueue({ groups, stage, selected, busy, onToggle, onToggleDomain, onOpen }: ValidationQueueProps): JSX.Element {
  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const actionable = group.items.filter((a) => isActionable(a, stage))
        const allSelected = actionable.length > 0 && actionable.every((a) => selected.has(a.id))
        return (
          <div key={group.code} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              {actionable.length > 0 && (
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={busy}
                  onChange={() => onToggleDomain(group)}
                  aria-label={`Sélectionner le domaine ${group.code}`}
                  className="shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-gray-900 truncate">
                  <span className="font-mono text-gray-500">{group.code}</span> · {group.name}
                </p>
              </div>
              {actionable.length > 0 && (
                <span className="shrink-0 text-[11px] font-semibold text-forest-700 bg-forest-50 px-2 py-0.5 rounded-full">
                  {actionable.length} à valider
                </span>
              )}
            </div>
            <ul>
              {group.items.map((a) => {
                const canAct = isActionable(a, stage)
                const status = ASSESSMENT_STATUS_CONFIG[a.status]
                return (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60">
                    {canAct ? (
                      <input
                        type="checkbox"
                        checked={selected.has(a.id)}
                        disabled={busy}
                        onChange={() => onToggle(a.id)}
                        aria-label={`Sélectionner ${a.control.code}`}
                        className="shrink-0"
                      />
                    ) : (
                      <span className="w-[13px] shrink-0" aria-hidden />
                    )}
                    <button onClick={() => onOpen(a)} className="min-w-0 flex-1 text-left">
                      <span className="text-[13px] text-gray-800 truncate block">
                        <span className="font-mono text-gray-500">{a.control.code}</span> {a.control.name}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {a.auditor.first_name} {a.auditor.last_name}
                      </span>
                    </button>
                    {classificationPill(a)}
                    <Badge label={status.label} variant={status.variant} />
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
