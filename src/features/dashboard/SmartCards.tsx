import { AlertTriangle, BarChart3, Calendar, Activity, ArrowRight } from 'lucide-react'
import type { DashboardStats, NearestDeadline, PriorityMission } from './useDashboardStats'

interface SmartCardsProps {
  stats: DashboardStats
  nearestDeadline: NearestDeadline | null
  priorityMission: PriorityMission | null
}

function scoreColorClass(score: number): string {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-gold-600'
  return 'text-error'
}

function iconBgClass(variant: 'forest' | 'gold' | 'red' | 'blue'): string {
  const map = {
    forest: 'bg-forest-100 text-forest-700',
    gold: 'bg-gold-200 text-gold-600',
    red: 'bg-red-100 text-error',
    blue: 'bg-forest-100 text-forest-700',
  }
  return map[variant]
}

export function SmartCards({ stats, nearestDeadline, priorityMission }: SmartCardsProps): JSX.Element {
  return (
    <div className="grid grid-cols-4 gap-4">
      <PriorityCard mission={priorityMission} />
      <ScoreCard score={stats.averageScore} />
      <DeadlineCard deadline={nearestDeadline} />
      <ActivityCard
        totalAssessments={stats.pendingReviews + stats.clientRejections}
        totalDocuments={stats.totalDocuments}
      />
    </div>
  )
}

function PriorityCard({ mission }: { mission: PriorityMission | null }): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow group border-l-4 border-l-gold-500">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 ${iconBgClass('gold')}`}>
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
        Mission prioritaire
      </div>
      {mission ? (
        <>
          <div className="mt-1 text-[14px] font-bold text-gray-900 truncate">{mission.name}</div>
          <div className="text-[12px] text-gray-400 truncate">{mission.clientName}</div>
          <div className="mt-2 text-[11px] text-gold-600 font-medium">{mission.reason}</div>
        </>
      ) : (
        <div className="mt-1 text-[13px] text-gray-400">Aucune mission urgente</div>
      )}
      <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-gray-200 group-hover:text-gold-500 transition-colors" />
    </div>
  )
}

function ScoreCard({ score }: { score: number }): JSX.Element {
  const colorClass = scoreColorClass(score)
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 ${iconBgClass('forest')}`}>
        <BarChart3 className="h-4 w-4" />
      </div>
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
        Score moyen
      </div>
      <div className={`mt-1 text-[28px] font-extrabold tracking-tight ${colorClass}`}>
        {score}%
      </div>
      <div className="text-[11px] text-gray-300">Conformit&eacute; globale</div>
    </div>
  )
}

function DeadlineCard({ deadline }: { deadline: NearestDeadline | null }): JSX.Element {
  const isUrgent = deadline !== null && deadline.daysRemaining <= 7
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 ${iconBgClass(isUrgent ? 'red' : 'forest')}`}>
        <Calendar className="h-4 w-4" />
      </div>
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
        Prochaine &eacute;ch&eacute;ance
      </div>
      {deadline ? (
        <>
          <div className={`mt-1 text-[28px] font-extrabold tracking-tight ${isUrgent ? 'text-error' : 'text-forest-700'}`}>
            {deadline.daysRemaining}j
          </div>
          <div className="text-[11px] text-gray-300 truncate">{deadline.missionName}</div>
        </>
      ) : (
        <div className="mt-1 text-[13px] text-gray-400">&mdash;</div>
      )}
    </div>
  )
}

function ActivityCard({ totalAssessments, totalDocuments }: { totalAssessments: number; totalDocuments: number }): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-3 ${iconBgClass('blue')}`}>
        <Activity className="h-4 w-4" />
      </div>
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">
        Activit&eacute;
      </div>
      <div className="mt-1 text-[28px] font-extrabold tracking-tight text-forest-700">
        {totalAssessments + totalDocuments}
      </div>
      <div className="text-[11px] text-gray-300">
        {totalAssessments} &eacute;valuations &middot; {totalDocuments} documents
      </div>
    </div>
  )
}
