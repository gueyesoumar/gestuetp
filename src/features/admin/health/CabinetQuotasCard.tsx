import { Gauge, Users, FolderOpen } from 'lucide-react'
import type { QuotaStats } from './useCabinetHealth'

interface QuotasCardProps {
  data: QuotaStats
}

export function CabinetQuotasCard({ data }: QuotasCardProps): JSX.Element {
  const usersBar = computeUsage(data.currentActiveUsers, data.maxUsers)
  const missionsBar = computeUsage(data.currentActiveMissions, data.maxMissions)
  const noLimit = data.maxUsers === null && data.maxMissions === null

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
          <Gauge size={13} />
        </div>
        <h3 className="text-[12.5px] font-bold text-gray-900">Quotas du plan</h3>
      </header>
      <div className="px-4 py-3 space-y-3">
        <QuotaBar
          icon={<Users size={12} />}
          label="Utilisateurs actifs"
          current={data.currentActiveUsers}
          max={data.maxUsers}
          state={usersBar}
        />
        <QuotaBar
          icon={<FolderOpen size={12} />}
          label="Missions actives"
          current={data.currentActiveMissions}
          max={data.maxMissions}
          state={missionsBar}
        />
        {noLimit && (
          <p className="text-[10.5px] text-gray-400 italic pt-1">Aucune limite définie sur ce plan.</p>
        )}
      </div>
    </section>
  )
}

type UsageState = 'unlimited' | 'safe' | 'warning' | 'critical' | 'over'

function computeUsage(current: number, max: number | null): UsageState {
  if (max === null) return 'unlimited'
  if (current > max) return 'over'
  const ratio = max === 0 ? 1 : current / max
  if (ratio >= 0.9) return 'critical'
  if (ratio >= 0.7) return 'warning'
  return 'safe'
}

function QuotaBar({ icon, label, current, max, state }: { icon: JSX.Element; label: string; current: number; max: number | null; state: UsageState }): JSX.Element {
  const ratio = max === null || max === 0 ? 0 : Math.min(1, current / max)
  const widthPct = Math.round(ratio * 100)
  const colors = {
    unlimited: { bar: 'bg-gray-200', text: 'text-gray-500' },
    safe:      { bar: 'bg-emerald-500', text: 'text-emerald-700' },
    warning:   { bar: 'bg-amber-500', text: 'text-amber-700' },
    critical:  { bar: 'bg-red-500', text: 'text-red-700' },
    over:      { bar: 'bg-red-600', text: 'text-red-700' },
  }[state]

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-400">{icon}</span>
        <span className="flex-1 text-[12px] text-gray-700">{label}</span>
        <span className={`text-[11.5px] font-mono font-semibold ${colors.text}`}>
          {current} {max === null ? '/ ∞' : `/ ${max}`}
        </span>
      </div>
      {max !== null && (
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all ${colors.bar}`}
            style={{ width: state === 'over' ? '100%' : `${widthPct}%` }}
          />
        </div>
      )}
      {state === 'over' && (
        <p className="text-[10px] text-red-600 mt-1">⚠️ Cabinet en surcapacité — futures insertions bloquées</p>
      )}
      {state === 'critical' && (
        <p className="text-[10px] text-red-600 mt-1">Quota presque atteint</p>
      )}
    </div>
  )
}
