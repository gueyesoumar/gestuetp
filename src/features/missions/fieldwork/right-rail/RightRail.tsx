import { useState, useRef } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { ValidationTab } from './ValidationTab'
import { DiscussionTab } from './DiscussionTab'
import { ControlContextTab } from './ControlContextTab'
import { ControlEvidenceTab } from './ControlEvidenceTab'
import { ControlSummaryCard } from './ControlSummaryCard'
import { ControlSignals } from './ControlSignals'
import { RailSection } from './RailSection'
import { PolicyEvidencePanel } from '../../../policy/PolicyEvidencePanel'
import { useControlComments } from './useControlComments'
import type { AssessmentWithControl } from '../../useAuditorAssessments'
import type { MissionDetail } from '../../useMissionDetail'

interface RightRailProps {
  mission: MissionDetail
  assessment: AssessmentWithControl | null
  collapsed: boolean
  onToggle: () => void
}

export function RightRail({ mission, assessment, collapsed, onToggle }: RightRailProps) {
  const commentsHook = useControlComments(mission.id, assessment?.control_id ?? null)
  // Sections repliables (remplacent les onglets). Contexte + Preuves ouverts par défaut.
  const [open, setOpen] = useState<Record<string, boolean>>({ contexte: true, preuves: true })
  const scrollRef = useRef<HTMLDivElement>(null)

  const toggle = (id: string): void => setOpen((o) => ({ ...o, [id]: !o[id] }))
  // Un signal déroule la section visée et l'amène à l'écran.
  const jumpTo = (id: string): void => {
    setOpen((o) => ({ ...o, [id]: true }))
    requestAnimationFrame(() => {
      scrollRef.current?.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="w-7 shrink-0 border-l border-gray-200 bg-[#FAFAF8] hover:bg-forest-50 transition-colors flex items-start justify-center pt-3 group relative"
        aria-label="Afficher le contexte du contr&ocirc;le"
        title="Afficher le contexte"
      >
        <ChevronLeft size={14} className="text-gray-400 group-hover:text-forest-700" />
        {commentsHook.unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
      </button>
    )
  }

  return (
    <aside className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-[#FAFAF8]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Contr&ocirc;le</span>
        <button type="button" onClick={onToggle} className="ml-auto text-gray-400 hover:text-gray-700" aria-label="Masquer" title="Masquer">
          <ChevronRight size={15} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {!assessment ? (
          <p className="text-[11px] text-gray-400 italic text-center py-10 px-4 leading-relaxed">
            S&eacute;lectionnez un contr&ocirc;le pour voir son contexte, ses preuves et les &eacute;changes.
          </p>
        ) : (
          <>
            <div className="p-3 space-y-3">
              <ControlSummaryCard
                code={assessment.control.code}
                name={assessment.control.name}
                riskLevel={assessment.control.risk_level ?? null}
                conformityLevel={assessment.conformity_level ?? null}
              />
              <ControlSignals
                missionId={mission.id}
                controlId={assessment.control_id}
                unreadCount={commentsHook.unreadCount}
                missionEndDate={mission.end_date ?? null}
                status={assessment.status}
                onJump={jumpTo}
              />
            </div>

            <RailSection id="contexte" title="Contexte" open={!!open.contexte} onToggle={() => toggle('contexte')}>
              <ControlContextTab assessment={assessment} missionId={mission.id} />
            </RailSection>
            <RailSection id="preuves" title="Preuves" open={!!open.preuves} onToggle={() => toggle('preuves')}>
              <ControlEvidenceTab assessment={assessment} missionId={mission.id} />
            </RailSection>
            <RailSection
              id="discussion"
              title="Discussion"
              badge={commentsHook.unreadCount > 0 ? <span className="text-red-600">{commentsHook.unreadCount} non lus</span> : undefined}
              open={!!open.discussion}
              onToggle={() => toggle('discussion')}
            >
              <DiscussionTab hook={commentsHook} />
            </RailSection>
            <RailSection id="validation" title="Validation" open={!!open.validation} onToggle={() => toggle('validation')}>
              <ValidationTab assessment={assessment} missionEndDate={mission.end_date ?? null} />
              <PolicyEvidencePanel controlId={assessment.control_id} />
            </RailSection>
          </>
        )}
      </div>
    </aside>
  )
}
