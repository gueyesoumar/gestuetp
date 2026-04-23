import { InfoPopover } from '../../components/ui/InfoPopover'

type KpiVariant = 'forest' | 'gold' | 'error' | 'neutral'

const barColors: Record<KpiVariant, string> = {
  forest: 'bg-forest-500',
  gold: 'bg-gold-500',
  error: 'bg-error',
  neutral: 'bg-gray-200',
}

const valueColors: Record<KpiVariant, string> = {
  forest: 'text-forest-700',
  gold: 'text-gold-600',
  error: 'text-error',
  neutral: 'text-gray-500',
}

interface KpiCardProps {
  label: string
  value: number | string
  sub?: string
  variant?: KpiVariant
  info?: string
}

export function KpiCard({ label, value, sub, variant = 'forest', info }: KpiCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${barColors[variant]}`} />
      <div className="flex items-start justify-between">
        <div className="text-[12px] font-medium text-gray-500">{label}</div>
        {info && <InfoPopover text={info} />}
      </div>
      <div className={`mt-1 text-[26px] font-extrabold tracking-tight ${valueColors[variant]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-gray-300">{sub}</div>}
    </div>
  )
}
