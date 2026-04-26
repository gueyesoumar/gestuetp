import { Link } from 'react-router-dom'
import { Activity, AlertTriangle } from 'lucide-react'
import { useAdminMonitoring, type AdminMonitoringStats } from '../../features/admin/useAdminMonitoring'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

export function MonitoringPage() {
  const { stats, loading, error } = useAdminMonitoring()

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorAlert message={error} /></div>
  if (!stats) return null

  return (
    <div className="px-7 py-6">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[11.5px] text-gray-500"><b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Santé / Monitoring</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Santé plateforme</h1>
      <p className="text-[12.5px] text-gray-500 mb-2">Usage IA, emails et storage. Coûts estimés à partir des prix Anthropic au 26 avril 2026.</p>

      <KpiRow stats={stats} />

      <section className="mt-6 grid grid-cols-[1.4fr_1fr] gap-4">
        <FunctionsTable stats={stats} />
        <RightColumn stats={stats} />
      </section>

      <section className="mt-6">
        <FailuresList stats={stats} />
      </section>
    </div>
  )
}

function KpiRow({ stats }: { stats: AdminMonitoringStats }) {
  const successRate = stats.ai_30d.total_calls > 0
    ? Math.round((stats.ai_30d.success_calls / stats.ai_30d.total_calls) * 1000) / 10
    : 100
  return (
    <div className="grid grid-cols-5 gap-3 mt-4">
      <KpiCard label="Appels IA · 30j" value={stats.ai_30d.total_calls.toLocaleString('fr-FR')} sub={`${stats.ai_7d.total_calls} sur 7j`} accent="gold" />
      <KpiCard label="Coût IA estimé · 30j" value={`${formatUsd(stats.ai_30d.cost_usd)}`} sub={`${formatUsd(stats.ai_7d.cost_usd)} sur 7j`} accent="gold" />
      <KpiCard label="Tokens input · 30j" value={`${(stats.ai_30d.input_tokens / 1000).toFixed(0)} k`} sub={`${(stats.ai_30d.output_tokens / 1000).toFixed(0)}k output`} accent="green" />
      <KpiCard label="Taux de succès" value={`${successRate}%`} sub={`${stats.ai_30d.failed_calls} échec(s)`} accent={successRate < 95 ? 'red' : 'green'} />
      <KpiCard label="Emails envoyés · 30j" value={stats.emails_30d_total.toLocaleString('fr-FR')} sub={`${stats.emails_30d_by_type.length} types`} accent="blue" />
    </div>
  )
}

function FunctionsTable({ stats }: { stats: AdminMonitoringStats }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="flex items-center px-4 py-3 border-b border-gray-200">
        <Activity size={14} className="text-forest-700 mr-2" />
        <span className="text-[13px] font-bold text-gray-900">Edge Functions IA · 30j</span>
        <span className="ml-auto text-[10.5px] text-gray-300">Trié par coût</span>
      </header>
      {stats.ai_per_function.length === 0 ? (
        <div className="px-4 py-8 text-center text-[12px] text-gray-300">Aucun appel IA enregistré dans les 30 derniers jours.</div>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
              <th className="text-left px-4 py-2 border-b border-gray-100">Fonction</th>
              <th className="text-right px-4 py-2 border-b border-gray-100">Appels</th>
              <th className="text-right px-4 py-2 border-b border-gray-100">Succès</th>
              <th className="text-right px-4 py-2 border-b border-gray-100">Durée moy.</th>
              <th className="text-right px-4 py-2 border-b border-gray-100">Coût</th>
            </tr>
          </thead>
          <tbody>
            {stats.ai_per_function.map((f) => (
              <tr key={f.function_name} className="hover:bg-page-bg">
                <td className="px-4 py-2 border-b border-gray-100 font-mono text-[11.5px] text-forest-900 font-semibold">{f.function_name}</td>
                <td className="px-4 py-2 border-b border-gray-100 text-right">{f.calls}</td>
                <td className="px-4 py-2 border-b border-gray-100 text-right">
                  <span className={f.success_rate < 90 ? 'text-red-600 font-bold' : 'text-gray-700'}>{f.success_rate}%</span>
                </td>
                <td className="px-4 py-2 border-b border-gray-100 text-right text-[11.5px] text-gray-500">{f.avg_duration_ms ? `${(f.avg_duration_ms / 1000).toFixed(1)}s` : '—'}</td>
                <td className="px-4 py-2 border-b border-gray-100 text-right font-mono text-[12px]">{formatUsd(f.cost_usd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function RightColumn({ stats }: { stats: AdminMonitoringStats }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-200">
          <span className="text-[13px] font-bold text-gray-900">Top organisations · coût IA</span>
        </header>
        {stats.ai_per_cabinet.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-gray-300">Aucun appel attribué à une organisation.</div>
        ) : (
          <ul>
            {stats.ai_per_cabinet.map((c) => (
              <li key={c.organization_id} className="flex items-center px-4 py-2 border-b border-gray-100 last:border-b-0 text-[12.5px]">
                <Link to={`/admin/cabinets/${c.organization_id}`} className="text-gray-900 font-semibold hover:text-forest-700 truncate flex-1">{c.cabinet_name}</Link>
                <span className="text-[11px] text-gray-400 mx-3">{c.calls} appels</span>
                <span className="font-mono text-[12px]">{formatUsd(c.cost_usd)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <header className="flex items-center px-4 py-3 border-b border-gray-200">
          <span className="text-[13px] font-bold text-gray-900">Storage par organisation</span>
          <span className="ml-auto text-[10.5px] text-gray-300">Total : {stats.storage_total_mb.toFixed(1)} Mo</span>
        </header>
        {stats.storage_per_cabinet.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-gray-300">Aucun document indexé.</div>
        ) : (
          <ul>
            {stats.storage_per_cabinet.map((c) => (
              <li key={c.organization_id} className="flex items-center px-4 py-2 border-b border-gray-100 last:border-b-0 text-[12.5px]">
                <Link to={`/admin/cabinets/${c.organization_id}`} className="text-gray-900 font-semibold hover:text-forest-700 truncate flex-1">{c.cabinet_name}</Link>
                <span className="text-[11px] text-gray-400 mx-3">{c.documents_count} doc</span>
                <span className="font-mono text-[12px]">{formatBytes(c.total_bytes)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-gray-200">
          <span className="text-[13px] font-bold text-gray-900">Emails par type · 30j</span>
        </header>
        {stats.emails_30d_by_type.length === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-gray-300">Aucun email envoyé.</div>
        ) : (
          <ul>
            {stats.emails_30d_by_type.map((e) => (
              <li key={e.type} className="flex items-center px-4 py-2 border-b border-gray-100 last:border-b-0 text-[12.5px]">
                <span className="font-mono text-[11.5px] text-forest-900 font-semibold flex-1">{e.type}</span>
                <span className="text-[12px] text-gray-700 font-bold">{e.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function FailuresList({ stats }: { stats: AdminMonitoringStats }) {
  if (stats.ai_recent_failures.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-[12.5px] text-green-700">
        ✓ Aucun échec d&apos;appel IA dans les 30 derniers jours.
      </div>
    )
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="flex items-center px-4 py-3 border-b border-gray-200">
        <AlertTriangle size={14} className="text-red-600 mr-2" />
        <span className="text-[13px] font-bold text-gray-900">Derniers échecs IA · 30j</span>
        <span className="ml-auto text-[10.5px] text-gray-300">{stats.ai_recent_failures.length} affichés (max 50)</span>
      </header>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
            <th className="text-left px-4 py-2 border-b border-gray-100">Quand</th>
            <th className="text-left px-4 py-2 border-b border-gray-100">Fonction</th>
            <th className="text-left px-4 py-2 border-b border-gray-100">Modèle</th>
            <th className="text-left px-4 py-2 border-b border-gray-100">Organisation</th>
            <th className="text-left px-4 py-2 border-b border-gray-100">Erreur</th>
          </tr>
        </thead>
        <tbody>
          {stats.ai_recent_failures.map((f) => (
            <tr key={f.id} className="hover:bg-page-bg">
              <td className="px-4 py-2 border-b border-gray-100 font-mono text-[11px] text-gray-500 whitespace-nowrap">{formatDateTime(f.created_at)}</td>
              <td className="px-4 py-2 border-b border-gray-100 font-mono text-[11.5px] text-forest-900 font-semibold">{f.function_name}</td>
              <td className="px-4 py-2 border-b border-gray-100 text-[11.5px] text-gray-500 font-mono">{f.model ?? '—'}</td>
              <td className="px-4 py-2 border-b border-gray-100 text-[12px] text-gray-700">{f.cabinet_name ?? <span className="text-gray-300">—</span>}</td>
              <td className="px-4 py-2 border-b border-gray-100 text-[12px] text-red-600 max-w-md truncate" title={f.error_message ?? ''}>{f.error_message ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: 'gold' | 'green' | 'blue' | 'red' }) {
  const accentClass = accent === 'gold' ? 'bg-gold-500' : accent === 'green' ? 'bg-forest-500' : accent === 'red' ? 'bg-red-500' : 'bg-blue-500'
  return (
    <div className="relative bg-white border border-gray-200 rounded-xl px-5 py-4 overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accentClass}`} />
      <div className="text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">{label}</div>
      <div className="text-[22px] font-extrabold text-gray-900 mt-1 tracking-tight">{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>
    </div>
  )
}

function formatUsd(usd: number): string {
  if (usd === 0) return '$0.00'
  if (usd < 0.01) return `<$0.01`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} Mo`
  return `${(bytes / 1_073_741_824).toFixed(2)} Go`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}
