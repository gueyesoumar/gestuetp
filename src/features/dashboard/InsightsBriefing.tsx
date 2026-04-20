import { Sparkles, TrendingUp } from 'lucide-react'
import type { DashboardStats } from './useDashboardStats'

interface InsightsBriefingProps {
  name: string
  stats: DashboardStats
}

export function InsightsBriefing({ name, stats }: InsightsBriefingProps): JSX.Element {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const rejectionNote = stats.clientRejections > 0
    ? ` Attention\u00a0: ${stats.clientRejections} rejet${stats.clientRejections > 1 ? 's' : ''} client \u00e0 traiter.`
    : ' Aucun rejet client.'

  const briefing = `${stats.activeMissions} mission${stats.activeMissions > 1 ? 's' : ''} en cours, ${stats.pendingReviews} contr\u00f4le${stats.pendingReviews > 1 ? 's' : ''} en attente de revue.${rejectionNote}`

  return (
    <div className="rounded-2xl bg-gradient-to-r from-forest-900 to-forest-700 px-7 py-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-gold-400" />
            <span className="text-[11px] font-medium text-gold-400 uppercase tracking-wider">
              Briefing du jour
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Bonjour, {name}
          </h2>
          <p className="mt-2 text-[13px] text-white/60 leading-relaxed max-w-2xl">
            {briefing}
          </p>
          {stats.averageScore >= 60 && (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-forest-300">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Score moyen de conformit&eacute;\u00a0: {stats.averageScore}%</span>
            </div>
          )}
        </div>
        <div className="text-[12px] text-white/40 bg-white/10 px-4 py-1.5 rounded-lg capitalize shrink-0 ml-4">
          {today}
        </div>
      </div>
    </div>
  )
}
