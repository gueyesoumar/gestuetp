import { Users, FolderOpen, Sparkles, Database } from 'lucide-react'
import type { CabinetHealth } from './useCabinetHealth'
import { formatBytes, formatRelative } from './healthHelpers'

interface KpiStripProps {
  health: CabinetHealth
}

export function CabinetKpiStrip({ health }: KpiStripProps): JSX.Element {
  const { activity, consumption } = health
  const activePct = activity.membersTotal > 0 ? Math.round((activity.membersActive / activity.membersTotal) * 100) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      <KpiCard
        label="Membres actifs"
        bgIcon="bg-blue-50"
        textIcon="text-blue-600"
        icon={<Users size={13} />}
        value={String(activity.membersActive)}
        suffix={`/ ${activity.membersTotal}`}
        hint={`${activePct}% actifs · dernière connexion ${formatRelative(activity.lastSignInAt)}`}
      />
      <KpiCard
        label="Missions"
        bgIcon="bg-emerald-50"
        textIcon="text-emerald-600"
        icon={<FolderOpen size={13} />}
        value={String(activity.missionsTotal)}
        delta={activity.missionsCreated30d > 0 ? `+${activity.missionsCreated30d}` : undefined}
        hint={`${activity.missionsCreated30d} créée${activity.missionsCreated30d > 1 ? 's' : ''} sur 30 derniers jours`}
      />
      <KpiCard
        label="Coût IA · 30j"
        bgIcon="bg-purple-50"
        textIcon="text-purple-600"
        icon={<Sparkles size={13} />}
        value={`$${consumption.aiCostUsd30d.toFixed(2)}`}
        mono
        hint={`${consumption.aiCalls30d} appels · ${(consumption.aiInputTokens30d + consumption.aiOutputTokens30d).toLocaleString('fr-FR')} tokens`}
      />
      <KpiCard
        label="Stockage"
        bgIcon="bg-orange-50"
        textIcon="text-orange-600"
        icon={<Database size={13} />}
        value={formatBytes(consumption.storageBytes)}
        mono
        hint={`${consumption.documentsCount} document${consumption.documentsCount > 1 ? 's' : ''}`}
      />
    </div>
  )
}

interface KpiCardProps {
  label: string
  bgIcon: string
  textIcon: string
  icon: JSX.Element
  value: string
  suffix?: string
  delta?: string
  mono?: boolean
  hint: string
}

function KpiCard({ label, bgIcon, textIcon, icon, value, suffix, delta, mono, hint }: KpiCardProps): JSX.Element {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10.5px] uppercase tracking-wider text-gray-500 font-bold">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bgIcon} ${textIcon}`}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-[26px] font-extrabold text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
        {suffix && <span className="text-[12px] text-gray-400 font-medium">{suffix}</span>}
        {delta && <span className="text-[12px] text-emerald-600 font-semibold">{delta}</span>}
      </div>
      <div className="text-[11px] text-gray-500 mt-0.5 truncate">{hint}</div>
    </div>
  )
}
