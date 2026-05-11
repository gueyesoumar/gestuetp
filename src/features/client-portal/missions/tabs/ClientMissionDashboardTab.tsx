import { Layers, Clock, FileText, CalendarDays } from 'lucide-react'
import { useClientDashboardData } from './useClientDashboardData'
import { ClientActionsList } from './ClientActionsList'
import { ClientMissionTimeline } from './ClientMissionTimeline'
import { ClientTeamCard } from './ClientTeamCard'
import { ClientUpcomingDeadlines } from './ClientUpcomingDeadlines'
import type { ClientMissionDetail } from '../useClientMissionDetail'

interface Props {
  mission: ClientMissionDetail
  onTabChange?: (tab: string) => void
}

const PHASE_LABELS: Record<string, string> = {
  initialization: 'Initialisation',
  scoping: 'Cadrage',
  planning: 'Planification',
  fieldwork: 'Travaux terrain',
  internal_review: 'Revue interne',
  client_review: 'Validation client',
  closure: 'Restitution',
}

export function ClientMissionDashboardTab({ mission, onTabChange }: Props): JSX.Element {
  const data = useClientDashboardData(mission)

  const handleNavigate = (tab: string): void => {
    if (onTabChange) onTabChange(tab)
  }

  if (data.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-forest-300 border-t-forest-700 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<div className="w-6 h-6 rounded-lg bg-forest-50 flex items-center justify-center"><Layers size={13} className="text-forest-700" /></div>}
          label="Avancement mission"
          value={`${data.overallPercent}%`}
          color="var(--color-forest-700)"
          bar={data.overallPercent}
          barColor="var(--color-forest-500)"
        />
        <KpiCard
          icon={<div className="w-6 h-6 rounded-lg bg-forest-50 flex items-center justify-center"><Clock size={13} className="text-forest-700" /></div>}
          label="Phase actuelle"
          value={PHASE_LABELS[mission.status] ?? mission.status}
          color="var(--color-forest-700)"
          sub={`\u00c9tape ${data.currentPhaseIndex + 1} sur ${data.totalPhases}`}
          smallValue
        />
        <KpiCard
          icon={<div className="w-6 h-6 rounded-lg bg-gold-50 flex items-center justify-center"><FileText size={13} className="text-gold-500" /></div>}
          label={`Documents demand\u00e9s`}
          value={`${data.docsUploaded}`}
          color="var(--color-gold-500)"
          sub={data.docsPending > 0 ? `${data.docsPending} en attente de votre part` : 'Tous fournis'}
          suffix={data.docsExpected > 0 ? ` / ${data.docsExpected}` : ''}
        />
        <KpiCard
          icon={<div className="w-6 h-6 rounded-lg bg-forest-50 flex items-center justify-center"><CalendarDays size={13} className="text-forest-700" /></div>}
          label="Jours restants"
          value={data.daysRemaining !== null ? `${data.daysRemaining}` : '\u2014'}
          color="var(--color-forest-700)"
          sub={mission.end_date ? `Fin pr\u00e9vue le ${formatDate(mission.end_date)}` : undefined}
        />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-[1fr_320px] gap-6">
        {/* Left column */}
        <div className="flex flex-col gap-6">
          <ClientActionsList
            docsPending={data.docsPending}
            interviewsPending={data.upcomingInterviewCount}
            carsPending={data.carsPendingCount}
            totalPending={data.totalPendingActions}
            onNavigate={handleNavigate}
          />
          <ClientMissionTimeline
            status={mission.status}
            startDate={mission.start_date}
            endDate={mission.end_date}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <ClientTeamCard missionId={mission.id} cabinetId={mission.cabinet_id} />
          <ClientUpcomingDeadlines
            missionId={mission.id}
            endDate={mission.end_date}
            status={mission.status}
          />
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, color, sub, bar, barColor, suffix, smallValue }: {
  icon: JSX.Element
  label: string
  value: string
  color: string
  sub?: string
  bar?: number
  barColor?: string
  suffix?: string
  smallValue?: boolean
}): JSX.Element {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3.5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className={`font-bold leading-none ${smallValue ? 'text-[15px] mt-1' : 'text-[22px]'}`} style={{ color }}>
        {value}
        {suffix && <span className="text-[13px] text-gray-300">{suffix}</span>}
      </p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
      {bar !== undefined && (
        <div className="h-1 bg-gray-100 rounded-full mt-2.5">
          <div className="h-1 rounded-full transition-all" style={{ width: `${bar}%`, background: barColor }} />
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
