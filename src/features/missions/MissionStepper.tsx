import { Diamond, Check } from 'lucide-react'
import type { MissionProgress } from './useMissionProgress'

interface MissionStepperProps {
  phases: MissionProgress['phases']
  activeTab: string
  onTabChange: (tab: string) => void
}

const PHASE_TO_TAB: Record<string, string> = {
  scoping: 'scoping',
  planning: 'planning',
  fieldwork: 'fieldwork',
  internal_review: 'review',
  client_review: 'client_review',
  closure: 'closure',
}

export function MissionStepper({ phases, activeTab, onTabChange }: MissionStepperProps) {
  return (
    <div className="flex items-center px-7 bg-white border-b border-gray-200 overflow-x-auto">
      {/* Overview button — always accessible */}
      <button
        onClick={() => onTabChange('overview')}
        className={`flex items-center gap-2 py-4 px-3 mr-4 shrink-0 relative text-xs font-medium whitespace-nowrap transition-colors ${
          activeTab === 'overview'
            ? 'text-forest-700 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-forest-700 after:rounded-t'
            : 'text-gray-500 hover:text-forest-700'
        }`}
      >
        <Diamond size={12} /> Vue d&rsquo;ensemble
      </button>

      <div className="w-px h-6 bg-gray-200 mr-4 shrink-0" />

      {phases.map((phase, i) => {
        const tab = PHASE_TO_TAB[phase.key]
        const isClickable = phase.state === 'done' || phase.state === 'active'

        return (
          <div key={phase.key} className="flex items-center">
            {i > 0 && <Connector state={phase.state === 'done' || phases[i - 1]?.state === 'done' ? 'done' : phase.state === 'active' ? 'active' : 'locked'} />}

            <button
              onClick={() => isClickable && onTabChange(tab)}
              disabled={!isClickable}
              className={`flex items-center gap-2.5 py-4 px-1.5 shrink-0 relative ${
                activeTab === tab ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-forest-700 after:rounded-t' : ''
              }`}
            >
              <StepDot state={phase.state} index={i + 1} />
              <div className="flex flex-col">
                <span className={`text-xs font-medium whitespace-nowrap ${
                  phase.state === 'done' ? 'text-green-600' :
                  phase.state === 'active' ? 'text-forest-700 font-semibold' :
                  'text-gray-300'
                }`}>
                  {phase.label}
                </span>
                {phase.sublabel && (
                  <span className={`text-[10px] mt-0.5 ${
                    phase.state === 'active' ? 'text-forest-500' : 'text-gray-300'
                  }`}>
                    {phase.sublabel}
                  </span>
                )}
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}

function StepDot({ state, index }: { state: 'done' | 'active' | 'locked'; index: number }){
  const base = 'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-all'

  if (state === 'done') {
    return <div className={`${base} bg-green-600 text-white`}><Check size={14} /></div>
  }
  if (state === 'active') {
    return <div className={`${base} bg-forest-700 text-white shadow-[0_0_0_4px_theme(colors.forest.100)]`}>{index}</div>
  }
  return <div className={`${base} bg-white text-gray-300 border-2 border-gray-200`}>{index}</div>
}

function Connector({ state }: { state: 'done' | 'active' | 'locked' }){
  const color = state === 'done' ? 'bg-green-600' :
    state === 'active' ? 'bg-gradient-to-r from-green-600 to-forest-300' :
    'bg-gray-200'
  return <div className={`w-8 h-0.5 shrink-0 ${color}`} />
}
