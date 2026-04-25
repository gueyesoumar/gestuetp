import { Link } from 'react-router-dom'
import { useAdminStats } from '../../features/admin/useAdminStats'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

export function AdminDashboardPage() {
  const { stats, loading, error } = useAdminStats()

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorAlert message={error} /></div>
  if (!stats) return null

  const max = Math.max(...stats.activity_14d, 1)

  return (
    <div className="px-7 py-6">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-[11.5px] text-gray-500"><b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Tableau de bord</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Vue d&apos;ensemble plateforme</h1>
      <p className="text-[12.5px] text-gray-500 mb-6">Cumul de toutes les organisations Gëstu &mdash; chiffres en lecture seule.</p>

      <div className="grid grid-cols-4 gap-3.5 mb-6">
        <KpiCard label="Cabinets actifs" value={stats.cabinets_active.toString()} sub={`/ ${stats.cabinets_total} total · ${stats.cabinets_suspended} suspendu(s)`} accent="gold" />
        <KpiCard label="Utilisateurs actifs · 30j" value={stats.users_active_30d.toString()} sub="connectés au moins 1 fois" accent="green" />
        <KpiCard label="Missions en cours" value={stats.missions_in_progress.toString()} sub="tous cabinets confondus" accent="blue" />
        <KpiCard
          label="MRR estimé"
          value={`${stats.mrr_eur_estimated.toLocaleString('fr-FR')} €`}
          sub="placeholder · Stripe en Phase 2"
          accent="gold"
          tooltip="Calcul naïf : Σ (cabinets actifs × tarif du plan). Pas un chiffre comptable."
        />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <header className="flex items-center px-4 py-3 border-b border-gray-200">
            <span className="text-[13px] font-bold text-gray-900">Activité plateforme · 14 derniers jours</span>
            <span className="ml-auto text-[11px] text-gray-300">missions touchées par jour</span>
          </header>
          <div className="px-5 py-5 h-[180px] flex items-end gap-1.5">
            {stats.activity_14d.map((value, idx) => (
              <div
                key={idx}
                className="flex-1 bg-forest-500 rounded-t-md transition-all"
                style={{ height: `${(value / max) * 100}%`, minHeight: '4px' }}
                title={`Jour J-${stats.activity_14d.length - 1 - idx} : ${value} mission(s) modifiée(s)`}
              />
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <header className="flex items-center px-4 py-3 border-b border-gray-200">
            <span className="text-[13px] font-bold text-gray-900">Alertes plateforme</span>
          </header>
          <div>
            {stats.alerts.length === 0 ? (
              <div className="px-4 py-6 text-center text-[12px] text-gray-300">Aucune alerte. Tout est en ordre.</div>
            ) : (
              stats.alerts.map((a, i) => (
                <div key={i} className={`flex items-start gap-2.5 px-4 py-3 ${i < stats.alerts.length - 1 ? 'border-b border-gray-200' : ''}`}>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${a.kind === 'red' ? 'bg-red-50 text-red-700' : a.kind === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                    {a.kind === 'red' ? '!' : a.kind === 'warn' ? '⚠' : 'i'}
                  </span>
                  <div className="text-[12.5px] text-gray-700 leading-relaxed">{a.message}</div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 bg-white border border-gray-200 rounded-xl px-5 py-5">
        <h3 className="text-[13px] font-bold text-gray-900 mb-3">Raccourcis</h3>
        <div className="flex gap-2.5 flex-wrap">
          <Link to="/admin/cabinets" className="px-3.5 py-2 bg-forest-900 text-white rounded-lg text-[12.5px] font-semibold hover:bg-forest-700">Voir tous les cabinets &rarr;</Link>
          <Link to="/admin/utilisateurs" className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[12.5px] font-semibold hover:bg-forest-50">Rechercher un utilisateur</Link>
          <Link to="/admin/audit-log" className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[12.5px] font-semibold hover:bg-forest-50">Audit log</Link>
        </div>
      </section>
    </div>
  )
}

function KpiCard({ label, value, sub, accent, tooltip }: { label: string; value: string; sub: string; accent: 'gold' | 'green' | 'blue'; tooltip?: string }) {
  const accentClass = accent === 'gold' ? 'bg-gold-500' : accent === 'green' ? 'bg-forest-500' : 'bg-blue-500'
  return (
    <div className="relative bg-white border border-gray-200 rounded-xl px-5 py-4 overflow-hidden" title={tooltip}>
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accentClass}`} />
      <div className="text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">{label}</div>
      <div className="text-[26px] font-extrabold text-gray-900 mt-1 tracking-tight">{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>
    </div>
  )
}
