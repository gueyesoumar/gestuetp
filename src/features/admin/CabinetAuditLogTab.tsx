import { useCabinetAuditLog, type CabinetAuditLogRow } from './useCabinetAuditLog'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'

interface Props {
  cabinetId: string
}

const ACTION_LABELS: Record<string, { label: string; variant: 'green' | 'warn' | 'blue' | 'gold' | 'gray' | 'red' }> = {
  suspend_cabinet: { label: 'Suspension cabinet', variant: 'warn' },
  reactivate_cabinet: { label: 'Réactivation cabinet', variant: 'green' },
  export_cabinet_data: { label: 'Export cabinet', variant: 'blue' },
  delete_cabinet: { label: 'Suppression cabinet', variant: 'red' },
  create_cabinet: { label: 'Création cabinet', variant: 'green' },
  reset_user_password: { label: 'Reset password', variant: 'blue' },
  change_user_role: { label: 'Changement rôle', variant: 'gold' },
  activate_user: { label: 'Activation user', variant: 'green' },
  deactivate_user: { label: 'Désactivation user', variant: 'red' },
  view_user: { label: 'Aperçu user', variant: 'blue' },
  set_feature_flag_override: { label: 'Override flag', variant: 'gold' },
  reset_feature_flag_override: { label: 'Reset override flag', variant: 'gray' },
}

const VARIANT_CLASS: Record<string, string> = {
  green: 'bg-green-50 text-green-700',
  warn: 'bg-amber-50 text-amber-700',
  blue: 'bg-blue-50 text-blue-700',
  gold: 'bg-gold-50 text-gold-600',
  gray: 'bg-gray-100 text-gray-500',
  red: 'bg-red-50 text-red-700',
}

export function CabinetAuditLogTab({ cabinetId }: Props) {
  const { rows, loading, error } = useCabinetAuditLog(cabinetId)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorAlert message={error} />
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
        Aucune action super-admin sur ce cabinet ou ses membres.
      </div>
    )
  }

  const exportCsv = () => {
    const escape = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const header = ['Quand', 'Acteur', 'Email acteur', 'Action', 'Type cible', 'ID cible', 'Motif', 'Métadonnées']
    const lines = [header.join(',')]
    for (const r of rows) {
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
    a.download = `cabinet-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <div className="flex items-center mb-4">
        <span className="text-[12px] text-gray-500">{rows.length} actions sur ce cabinet ou ses membres</span>
        <button onClick={exportCsv} className="ml-auto text-[12px] text-forest-700 font-semibold hover:text-forest-900">
          ↓ Exporter CSV
        </button>
      </div>

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
    </div>
  )
}

function Row({ row }: { row: CabinetAuditLogRow }) {
  const info = ACTION_LABELS[row.action] ?? { label: row.action, variant: 'gray' as const }
  const meta = row.metadata
  const targetLabel = (() => {
    if (row.target_type === 'organization') return 'Cabinet'
    if (row.target_type === 'user') return meta?.email ? `User · ${String(meta.email)}` : 'User'
    return row.target_type
  })()
  return (
    <tr className="hover:bg-page-bg">
      <td className="px-4 py-3 border-b border-gray-100 font-mono text-[11px] text-gray-500 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
      <td className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center text-[9.5px] font-extrabold">{row.actor_first_name.charAt(0)}{row.actor_last_name.charAt(0)}</div>
          <span className="text-[12.5px] text-gray-700">{row.actor_first_name} {row.actor_last_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 border-b border-gray-100"><span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${VARIANT_CLASS[info.variant]}`}>{info.label}</span></td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-700">{targetLabel}</td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-700 max-w-md truncate" title={row.reason}>{row.reason}</td>
    </tr>
  )
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}
