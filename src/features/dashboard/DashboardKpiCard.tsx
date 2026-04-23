import { InfoPopover } from '../../components/ui/InfoPopover'
import type { ReactNode } from 'react'

interface DashboardKpiCardProps {
  icon: ReactNode
  iconBg: string
  label: string
  value: number | string
  sub: string
  info: string
  barColor: string
  valueColor?: string
}

export function DashboardKpiCard({ icon, iconBg, label, value, sub, info, barColor, valueColor }: DashboardKpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 py-3.5">
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${barColor}`} />
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${iconBg}`}>{icon}</div>
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
        </div>
        <InfoPopover text={info} />
      </div>
      <div className={`text-[22px] font-extrabold tracking-tight ${valueColor ?? 'text-forest-700'}`}>{value}</div>
      <div className="text-[10px] text-gray-300 mt-0.5">{sub}</div>
    </div>
  )
}
