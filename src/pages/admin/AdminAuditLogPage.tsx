import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { useAdminAuditLog, type AuditLogRow } from '../../features/admin/useAdminAuditLog'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

const ACTION_LABELS: Record<string, { label: string; variant: 'green' | 'warn' | 'blue' | 'gold' | 'gray' | 'red' }> = {
  suspend_cabinet: { label: 'Suspension cabinet', variant: 'warn' },
  reactivate_cabinet: { label: 'Réactivation cabinet', variant: 'green' },
  export_cabinet_data: { label: 'Export cabinet', variant: 'blue' },
  reset_user_password: { label: 'Reset password', variant: 'blue' },
  change_user_role: { label: 'Changement rôle', variant: 'gold' },
  activate_user: { label: 'Activation user', variant: 'green' },
  deactivate_user: { label: 'Désactivation user', variant: 'red' },
}

const PERIOD_OPTIONS = [
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
  { value: 90, label: '90 jours' },
  { value: 365, label: '12 mois' },
]

export function AdminAuditLogPage() {
  const [sinceDays, setSinceDays] = useState(30)
  const [actionFilter, setActionFilter] = useState<string | null>(null)
  const { rows, loading, error } = useAdminAuditLog({ sinceDays, action: actionFilter })

  const actionOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.action))
    return Array.from(set).sort()
  }, [rows])

  const exportCsv = () => {
    const escape = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const header = ['Quand', 'Acteur', 'Email acteur', 'Action', 'Type cible', 'ID cible', 'Motif', 'Métadonnées']
    const lines = [header.join(',')]
    for (const r of rows.slice(0, 5000)) {
      lines.push([
        escape(new Date(r.created_at).toISOString()),
        escape(`${r.actor_first_name} ${r.actor_last_name}`),
        escape(r.actor_email),
        escape(r.action),
        escape(r.target_type),
        escape(r.target_id ?? ''),
        escape(r.reason),
        escape(JSON.stringify(r.metadata ?? {})),
      ].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv; charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `admin-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="px-7 py-6">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[11.5px] text-gray-500"><b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Audit log</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Audit log plateforme</h1>
      <p className="text-[12.5px] text-gray-500 mb-5">Toutes les actions super-admin tracées avec acteur, motif et timestamp. Rétention indéfinie.</p>

      <div className="flex items-center gap-2 mb-4">
        <select value={sinceDays} onChange={(e) => setSinceDays(Number(e.target.value))} className="text-[12.5px] py-1.5 px-3" style={{ width: 'auto' }}>
          {PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>Période · {p.label}</option>)}
        </select>
        <select value={actionFilter ?? ''} onChange={(e) => setActionFilter(e.target.value || null)} className="text-[12.5px] py-1.5 px-3" style={{ width: 'auto' }}>
          <option value="">Toutes les actions</option>
          {actionOptions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</option>)}
        </select>
        <button onClick={exportCsv} disabled={rows.length === 0} className="ml-auto text-[12px] inline-flex items-center gap-1.5 text-forest-700 font-semibold hover:text-forest-900 disabled:opacity-50">
          <Download size={13} /> Exporter CSV ({rows.length})
        </button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
          Aucune action sur la période sélectionnée.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-page-bg text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
                <th className="text-left px-4 py-3 border-b border-gray-200">Quand</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Acteur</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Action</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Cible</th>
                <th className="text-left px-4 py-3 border-b border-gray-200">Motif</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => <Row key={r.id} row={r} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Row({ row }: { row: AuditLogRow }) {
  const actionInfo = ACTION_LABELS[row.action] ?? { label: row.action, variant: 'gray' as const }
  const variantClass = {
    green: 'bg-green-50 text-green-700',
    warn: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    gold: 'bg-gold-50 text-gold-600',
    gray: 'bg-gray-100 text-gray-500',
    red: 'bg-red-50 text-red-700',
  }[actionInfo.variant]
  return (
    <tr className="hover:bg-page-bg">
      <td className="px-4 py-3 border-b border-gray-100 font-mono text-[11.5px] text-gray-500 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
      <td className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center text-[9.5px] font-extrabold">{row.actor_first_name.charAt(0)}{row.actor_last_name.charAt(0)}</div>
          <span className="text-[12.5px] text-gray-700">{row.actor_first_name} {row.actor_last_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 border-b border-gray-100"><span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${variantClass}`}>{actionInfo.label}</span></td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-700">
        <span className="capitalize">{row.target_type}</span>
        {row.metadata && row.metadata.name ? <span className="text-gray-500"> · {String(row.metadata.name)}</span> : null}
        {row.metadata && row.metadata.email ? <span className="text-gray-500"> · {String(row.metadata.email)}</span> : null}
      </td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-700 max-w-md truncate" title={row.reason}>{row.reason}</td>
    </tr>
  )
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}
