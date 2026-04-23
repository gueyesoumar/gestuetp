import { Briefcase, Target, Settings } from 'lucide-react'
import { DASHBOARD_VIEW_LABELS } from '../../lib/constants'
import type { DashboardView } from '../../types/database.types'

interface DashboardViewSwitcherProps {
  allowedViews: DashboardView[]
  activeView: DashboardView
  onSwitch: (view: DashboardView) => void
}

const VIEW_ICONS: Record<DashboardView, React.ReactNode> = {
  executive: <Briefcase size={14} />,
  pilotage: <Target size={14} />,
  operationnel: <Settings size={14} />,
}

export function DashboardViewSwitcher({ allowedViews, activeView, onSwitch }: DashboardViewSwitcherProps) {
  if (allowedViews.length <= 1) return null

  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 mb-5">
      {allowedViews.map((view) => (
        <button
          key={view}
          onClick={() => onSwitch(view)}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium transition-colors ${
            activeView === view
              ? 'bg-forest-700 text-white'
              : 'text-gray-500 hover:bg-forest-50 hover:text-forest-700'
          }`}
        >
          {VIEW_ICONS[view]}
          {DASHBOARD_VIEW_LABELS[view]}
        </button>
      ))}
    </div>
  )
}
