import { WelcomeBanner } from './WelcomeBanner'
import { KpiCard } from './KpiCard'
import { AlertCardsRow } from './AlertCards'
import { ActionsList } from './ActionsList'
import { MissionsList } from './MissionsList'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { useDashboardStats } from './useDashboardStats'
import { useAuth } from '../../hooks/useAuth'

export function CabinetDashboard() {
  const { profile } = useAuth()
  const { stats, missions, loading, error } = useDashboardStats()

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />

  const firstName = profile?.first_name ?? ''
  const subtitle = `Vous avez ${stats.activeMissions} mission${stats.activeMissions > 1 ? 's' : ''} active${stats.activeMissions > 1 ? 's' : ''} et ${stats.pendingReviews} contr\u00f4le${stats.pendingReviews > 1 ? 's' : ''} en attente de revue.`

  // Build actions from stats
  const actions = []
  if (stats.clientRejections > 0) {
    actions.push({
      id: 'rejections',
      text: `Corriger <strong>${stats.clientRejections} contr\u00f4le${stats.clientRejections > 1 ? 's' : ''}</strong> rejet\u00e9${stats.clientRejections > 1 ? 's' : ''} par le client`,
      priority: 'urgent' as const,
    })
  }
  if (stats.pendingReviews > 0) {
    actions.push({
      id: 'reviews',
      text: `Revoir <strong>${stats.pendingReviews} contr\u00f4le${stats.pendingReviews > 1 ? 's' : ''}</strong> soumis par les auditeurs`,
      priority: 'todo' as const,
    })
  }
  if (missions.some((m) => m.status === 'planning' || m.status === 'initialization')) {
    actions.push({
      id: 'planning',
      text: 'Affecter les contr\u00f4les sur les missions en planification',
      priority: 'planning' as const,
    })
  }

  return (
    <div>
      <WelcomeBanner name={firstName} subtitle={subtitle} />

      <div className="mt-4 grid grid-cols-4 gap-3.5">
        <KpiCard label="Missions actives" value={stats.activeMissions} sub={Object.entries(stats.missionsByStatus).filter(([k]) => k !== 'closure').map(([k, v]) => `${v} ${k}`).join(', ') || 'Aucune'} variant="forest" />
        <KpiCard label="Clients" value={stats.totalClients} variant="gold" />
        <KpiCard label="Contr&ocirc;les &agrave; revoir" value={stats.pendingReviews} sub="Soumis par les auditeurs" variant="forest" />
        <KpiCard label="Rejets client" value={stats.clientRejections} sub={stats.clientRejections > 0 ? '\u00c0 corriger en priorit\u00e9' : 'Aucun rejet'} variant={stats.clientRejections > 0 ? 'error' : 'neutral'} />
      </div>

      <AlertCardsRow pendingReviews={stats.pendingReviews} clientRejections={stats.clientRejections} />

      <div className="mt-4 grid grid-cols-[5fr_3fr] gap-4">
        <ActionsList actions={actions} />
        <MissionsList missions={missions} />
      </div>
    </div>
  )
}
