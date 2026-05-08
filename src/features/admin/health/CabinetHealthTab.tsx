import { Activity, BarChart3, AlertTriangle, Settings2, Clock, Users, FolderOpen, Sparkles, Database, FileText, ShieldCheck, Globe, Tag, Flag } from 'lucide-react'
import { useCabinetHealth } from './useCabinetHealth'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import type { ActivityStats, ConsumptionStats, ErrorsStats, ConfigStats } from './useCabinetHealth'

interface CabinetHealthTabProps {
  cabinetId: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Jamais'
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} jours`
  if (days < 365) return `il y a ${Math.floor(days / 30)} mois`
  return `il y a ${Math.floor(days / 365)} an${days >= 730 ? 's' : ''}`
}

export function CabinetHealthTab({ cabinetId }: CabinetHealthTabProps): JSX.Element {
  const health = useCabinetHealth(cabinetId)

  if (health.loading) return <LoadingSpinner />
  if (health.error) return <ErrorAlert message={health.error} />

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ActivityWidget data={health.activity} />
      <ConsumptionWidget data={health.consumption} />
      <ErrorsWidget data={health.errors} />
      <ConfigWidget data={health.config} />
    </div>
  )
}

function WidgetCard({ icon, title, color, children }: { icon: JSX.Element; title: string; color: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
        <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  )
}

function StatRow({ icon, label, value, hint }: { icon?: JSX.Element; label: string; value: string; hint?: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      {icon && <div className="text-gray-400 shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-gray-700">{label}</p>
        {hint && <p className="text-[10px] text-gray-400 leading-tight">{hint}</p>}
      </div>
      <span className="text-[13px] font-mono font-semibold text-gray-900 shrink-0">{value}</span>
    </div>
  )
}

function ActivityWidget({ data }: { data: ActivityStats }): JSX.Element {
  const activePct = data.membersTotal > 0 ? Math.round((data.membersActive / data.membersTotal) * 100) : 0
  return (
    <WidgetCard icon={<Activity size={15} className="text-blue-700" />} title="Activité" color="bg-blue-100">
      <StatRow icon={<Clock size={13} />} label="Dernière connexion d'un membre" value={formatRelative(data.lastSignInAt)} />
      <StatRow icon={<Users size={13} />} label="Membres actifs" value={`${data.membersActive}/${data.membersTotal}`} hint={`${activePct}% actifs`} />
      <StatRow icon={<FolderOpen size={13} />} label="Missions créées (30j)" value={String(data.missionsCreated30d)} hint={`${data.missionsTotal} au total`} />
    </WidgetCard>
  )
}

function ConsumptionWidget({ data }: { data: ConsumptionStats }): JSX.Element {
  const totalTokens = data.aiInputTokens30d + data.aiOutputTokens30d
  return (
    <WidgetCard icon={<BarChart3 size={15} className="text-purple-700" />} title="Consommation (30 derniers jours)" color="bg-purple-100">
      <StatRow icon={<Sparkles size={13} />} label="Appels IA" value={String(data.aiCalls30d)} hint={`${totalTokens.toLocaleString('fr-FR')} tokens`} />
      <StatRow icon={<Tag size={13} />} label="Coût IA estimé" value={`$${data.aiCostUsd30d.toFixed(2)}`} hint={`in: ${data.aiInputTokens30d.toLocaleString('fr-FR')} · out: ${data.aiOutputTokens30d.toLocaleString('fr-FR')}`} />
      <StatRow icon={<Database size={13} />} label="Stockage documents" value={formatBytes(data.storageBytes)} hint={`${data.documentsCount} fichier${data.documentsCount > 1 ? 's' : ''}`} />
    </WidgetCard>
  )
}

function ErrorsWidget({ data }: { data: ErrorsStats }): JSX.Element {
  const hasErrors = data.aiErrors30d > 0
  return (
    <WidgetCard icon={<AlertTriangle size={15} className="text-amber-700" />} title="Erreurs (30 derniers jours)" color="bg-amber-100">
      <StatRow
        label="Erreurs IA"
        value={String(data.aiErrors30d)}
        icon={<AlertTriangle size={13} className={hasErrors ? 'text-red-500' : 'text-gray-300'} />}
        hint={hasErrors ? '' : 'Aucune erreur récente'}
      />
      {data.topAiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
          <p className="text-[10px] uppercase tracking-wide font-bold text-red-700 mb-0.5">Top fonction en échec</p>
          <p className="text-[12px] font-mono text-red-800">{data.topAiError.functionName}</p>
          <p className="text-[10px] text-red-600">{data.topAiError.count} échec{data.topAiError.count > 1 ? 's' : ''}</p>
          {data.topAiError.lastMessage && (
            <p className="text-[10px] text-gray-500 italic mt-1 truncate" title={data.topAiError.lastMessage}>« {data.topAiError.lastMessage} »</p>
          )}
        </div>
      )}
      <p className="text-[10px] text-gray-300 italic">
        Les erreurs côté edge functions et auth ne sont pas encore loggées centralement.
      </p>
    </WidgetCard>
  )
}

function ConfigWidget({ data }: { data: ConfigStats }): JSX.Element {
  return (
    <WidgetCard icon={<Settings2 size={15} className="text-forest-700" />} title="Configuration" color="bg-forest-100">
      <div className="space-y-2">
        <ConfigLine
          icon={<FileText size={12} />}
          label="Logo principal (clair)"
          ok={data.hasLightLogo}
        />
        <ConfigLine
          icon={<FileText size={12} />}
          label="Logo variante sombre"
          ok={data.hasDarkLogo}
          neutral
        />
        <ConfigLine
          icon={<ShieldCheck size={12} />}
          label="Couleur primaire"
          ok={data.hasPrimaryColor}
        />
        <ConfigLine
          icon={<Globe size={12} />}
          label="Domaines custom"
          ok={data.domainsVerified > 0}
          customValue={data.domainsConfigured === 0 ? 'Aucun' : `${data.domainsVerified}/${data.domainsConfigured} vérifié${data.domainsVerified > 1 ? 's' : ''}`}
        />
        <ConfigLine
          icon={<Tag size={12} />}
          label="Plan"
          ok={!!data.planName}
          customValue={data.planName ?? 'Non défini'}
        />
        <ConfigLine
          icon={<Flag size={12} />}
          label="Feature flags activés"
          ok={data.activeFlagsCount > 0}
          neutral
          customValue={`${data.activeFlagsCount}`}
        />
      </div>
    </WidgetCard>
  )
}

function ConfigLine({ icon, label, ok, neutral, customValue }: { icon: JSX.Element; label: string; ok: boolean; neutral?: boolean; customValue?: string }): JSX.Element {
  const statusColor = neutral
    ? ok ? 'text-gray-700' : 'text-gray-400'
    : ok ? 'text-emerald-700' : 'text-amber-700'
  const statusBg = neutral
    ? ok ? 'bg-gray-100' : 'bg-gray-50'
    : ok ? 'bg-emerald-100' : 'bg-amber-100'
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-5 h-5 rounded ${statusBg} ${statusColor} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <span className="flex-1 text-[12px] text-gray-700">{label}</span>
      <span className={`text-[11px] font-semibold ${statusColor}`}>
        {customValue ?? (ok ? '✓ OK' : '— Manquant')}
      </span>
    </div>
  )
}
