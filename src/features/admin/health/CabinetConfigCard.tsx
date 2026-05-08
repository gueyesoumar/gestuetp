import { Settings2 } from 'lucide-react'
import type { ConfigStats } from './useCabinetHealth'

interface ConfigCardProps {
  data: ConfigStats
}

interface ConfigItem {
  label: string
  status: 'ok' | 'missing' | 'warning' | 'neutral' | 'count'
  value: string
}

export function CabinetConfigCard({ data }: ConfigCardProps): JSX.Element {
  const items: ConfigItem[] = [
    { label: 'Logo principal', status: data.hasLightLogo ? 'ok' : 'missing', value: data.hasLightLogo ? 'OK' : 'absent' },
    { label: 'Logo sombre', status: data.hasDarkLogo ? 'ok' : 'neutral', value: data.hasDarkLogo ? 'OK' : 'absent' },
    { label: 'Couleur primaire', status: data.hasPrimaryColor ? 'ok' : 'missing', value: data.hasPrimaryColor ? 'OK' : 'absente' },
    {
      label: 'Domaines custom',
      status: data.domainsConfigured === 0
        ? 'neutral'
        : data.domainsVerified === data.domainsConfigured
          ? 'ok'
          : 'warning',
      value: data.domainsConfigured === 0
        ? 'Aucun'
        : `${data.domainsVerified}/${data.domainsConfigured} vérifié${data.domainsVerified > 1 ? 's' : ''}`,
    },
    { label: 'Plan', status: data.planName ? 'ok' : 'missing', value: data.planName ?? 'Non défini' },
    { label: 'Feature flags actifs', status: 'count', value: String(data.activeFlagsCount) },
  ]

  const okCount = items.filter((i) => i.status === 'ok').length
  const total = items.length

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="px-4 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-forest-100 text-forest-700 flex items-center justify-center">
          <Settings2 size={13} />
        </div>
        <h3 className="text-[12.5px] font-bold text-gray-900">Configuration</h3>
        <span className="ml-auto text-[10px] text-emerald-700 font-bold font-mono">
          {okCount}/{total} OK
        </span>
      </header>
      <div className="px-4 py-3 space-y-2">
        {items.map((item) => (
          <ConfigLine key={item.label} item={item} />
        ))}
      </div>
    </section>
  )
}

function ConfigLine({ item }: { item: ConfigItem }): JSX.Element {
  const { iconBg, iconColor, iconChar, valueColor } = computeStyles(item.status)
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded ${iconBg} ${iconColor} flex items-center justify-center text-[10px] font-bold`}>
        {iconChar}
      </div>
      <span className="flex-1 text-[12px] text-gray-700">{item.label}</span>
      <span className={`text-[10.5px] font-semibold ${valueColor} font-mono`}>{item.value}</span>
    </div>
  )
}

function computeStyles(status: ConfigItem['status']): { iconBg: string; iconColor: string; iconChar: string; valueColor: string } {
  switch (status) {
    case 'ok':
      return { iconBg: 'bg-emerald-100', iconColor: 'text-emerald-700', iconChar: '✓', valueColor: 'text-emerald-700' }
    case 'warning':
      return { iconBg: 'bg-amber-100', iconColor: 'text-amber-700', iconChar: '!', valueColor: 'text-amber-700' }
    case 'missing':
      return { iconBg: 'bg-red-50', iconColor: 'text-red-600', iconChar: '×', valueColor: 'text-red-600' }
    case 'count':
      return { iconBg: 'bg-forest-100', iconColor: 'text-forest-700', iconChar: '•', valueColor: 'text-forest-700' }
    case 'neutral':
    default:
      return { iconBg: 'bg-gray-100', iconColor: 'text-gray-400', iconChar: '—', valueColor: 'text-gray-400' }
  }
}
