import { Link } from 'react-router-dom'
import { useAdminStats } from '../../features/admin/useAdminStats'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { formatMoney } from '../../lib/money'
import { KpiTile } from '../../features/admin/dashboard/KpiTile'
import { ActivityChart } from '../../features/admin/dashboard/ActivityChart'
import { NatureBreakdown } from '../../features/admin/dashboard/NatureBreakdown'
import { AttentionFeed } from '../../features/admin/dashboard/AttentionFeed'

export function AdminDashboardPage() {
  const { stats, loading, error } = useAdminStats()

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorAlert message={error} /></div>
  if (!stats) return null

  return (
    <div className="px-7 py-6">
      <div className="text-[11.5px] text-gray-500 mb-1"><b className="text-forest-900 font-semibold">Admin</b> › Centre de commande</div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Centre de commande</h1>
      <p className="text-[12.5px] text-gray-500 mb-6">Cumul de toutes les organisations Gëstu — lecture seule.</p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-5">
        <KpiTile
          label="Organisations actives"
          value={stats.cabinets_active.toString()}
          delta={stats.new_orgs_30d > 0 ? `+${stats.new_orgs_30d} / 30j` : undefined}
          sub={`/ ${stats.cabinets_total} total · ${stats.cabinets_suspended} suspendue(s)`}
          accent="gold"
        />
        <KpiTile
          label="MRR net"
          value={formatMoney(stats.mrr_xof, 'XOF')}
          sub="abonnements actifs"
          accent="green"
          tooltip="Source unique platform_mrr()."
        />
        <KpiTile label="Utilisateurs · 30j" value={stats.users_active_30d.toString()} sub="connectés au moins 1 fois" accent="blue" />
        <KpiTile label="Missions en cours" value={stats.missions_in_progress.toString()} sub="toutes organisations" accent="green" />
        <KpiTile label="Essais en cours" value={stats.trials_count.toString()} sub="droits en période d'essai" accent="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 mb-4">
        <ActivityChart data={stats.activity_14d} />
        <NatureBreakdown data={stats.orgs_by_nature} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        <AttentionFeed alerts={stats.alerts} />
        <section className="bg-white border border-gray-200 rounded-xl px-5 py-5">
          <h3 className="text-[13px] font-bold text-gray-900 mb-3">Raccourcis</h3>
          <div className="flex flex-col gap-2">
            <Link to="/admin/cabinets" className="px-3.5 py-2 bg-forest-900 text-white rounded-lg text-[12.5px] font-semibold hover:bg-forest-700 text-center">Voir toutes les organisations →</Link>
            <Link to="/admin/monitoring" className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[12.5px] font-semibold hover:bg-forest-50 text-center">Santé / Monitoring</Link>
            <Link to="/admin/utilisateurs" className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[12.5px] font-semibold hover:bg-forest-50 text-center">Rechercher un utilisateur</Link>
            <Link to="/admin/audit-log" className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[12.5px] font-semibold hover:bg-forest-50 text-center">Audit log</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
