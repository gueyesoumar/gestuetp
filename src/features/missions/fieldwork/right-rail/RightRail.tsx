import { useState } from 'react'
import { ChevronRight, ChevronLeft, Check, MessageSquare, Info } from 'lucide-react'
import { ValidationTab } from './ValidationTab'
import { DiscussionTab } from './DiscussionTab'
import { MissionInfoTab } from './MissionInfoTab'
import { useControlComments } from './useControlComments'
import type { AssessmentWithControl } from '../../useAuditorAssessments'
import type { MissionDetail } from '../../useMissionDetail'

interface RightRailProps {
  mission: MissionDetail
  assessment: AssessmentWithControl | null
  collapsed: boolean
  onToggle: () => void
}

type TabKey = 'validation' | 'discussion' | 'mission'

export function RightRail({ mission, assessment, collapsed, onToggle }: RightRailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('validation')
  const commentsHook = useControlComments(mission.id, assessment?.control_id ?? null)

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
        {commentsHook.unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>
    )
  }

  return (
    <aside className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="flex items-stretch border-b border-gray-200 bg-[#FAFAF8]">
        <TabButton
          active={activeTab === 'validation'}
          onClick={() => setActiveTab('validation')}
          icon={<Check size={12} />}
          label="Validation"
        />
        <TabButton
          active={activeTab === 'discussion'}
          onClick={() => setActiveTab('discussion')}
          icon={<MessageSquare size={12} />}
          label="Discussion"
          badge={commentsHook.unreadCount}
        />
        <TabButton
          active={activeTab === 'mission'}
          onClick={() => setActiveTab('mission')}
          icon={<Info size={12} />}
          label="Mission"
        />
        <button
          type="button"
          onClick={onToggle}
          className="px-2 text-gray-400 hover:text-gray-700 border-l border-gray-200"
          aria-label="Masquer"
          title="Masquer"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'validation' && (
          <div className="flex-1 overflow-y-auto">
            <ValidationTab assessment={assessment} missionEndDate={mission.end_date ?? null} />
          </div>
        )}
        {activeTab === 'discussion' && (
          assessment ? (
            <DiscussionTab hook={commentsHook} />
          ) : (
            <p className="text-[11px] text-gray-400 italic text-center py-6 px-3">S&eacute;lectionnez un contr&ocirc;le.</p>
          )
        )}
        {activeTab === 'mission' && (
          <div className="flex-1 overflow-y-auto">
            <MissionInfoTab mission={mission} />
          </div>
        )}
      </div>
    </aside>
  )
}

function TabButton({ active, onClick, icon, label, badge }: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 px-2 py-2.5 text-[11px] font-medium inline-flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
        active
          ? 'border-gold-500 text-forest-900 bg-white'
          : 'border-transparent text-gray-500 hover:text-forest-700 hover:bg-white'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge != null && badge > 0 && (
        <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
          {badge}
        </span>
      )}
    </button>
  )
}
