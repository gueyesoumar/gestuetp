import { useState, useMemo } from 'react'
import { Download } from 'lucide-react'
import { useAdminAuditLog, type AuditLogRow } from '../../features/admin/useAdminAuditLog'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { KpiTile } from '../../features/admin/dashboard/KpiTile'

type Variant = 'green' | 'warn' | 'blue' | 'gold' | 'gray' | 'red' | 'purple'

// Couleur ET libellé de famille dérivés du target_type : chaque ligne reçoit un
// badge cohérent même pour une action non mappée, et les FilterPills filtrent par
// famille. Le libellé d'action (badge) vient de ACTION_LABELS (fallback humanisé).
const FAMILY: Record<string, { label: string; variant: Variant }> = {
  organization: { label: 'Cabinets', variant: 'green' },
  user: { label: 'Utilisateurs', variant: 'blue' },
  member: { label: 'Utilisateurs', variant: 'blue' },
  plan: { label: 'Plans', variant: 'gold' },
  feature_flag: { label: 'Fonctionnalités', variant: 'purple' },
  framework: { label: 'Référentiels', variant: 'warn' },
  control: { label: 'Référentiels', variant: 'warn' },
  domain: { label: 'Domaines', variant: 'gray' },
  entitlement: { label: 'Entitlements', variant: 'red' },
}
const OTHER_FAMILY = { label: 'Autres', variant: 'gray' as Variant }

const ACTION_LABELS: Record<string, string> = {
  create_cabinet: 'Création cabinet', suspend_cabinet: 'Suspension cabinet',
  reactivate_cabinet: 'Réactivation cabinet', delete_cabinet: 'Suppression cabinet',
  export_cabinet_data: 'Export données cabinet', update_cabinet_branding: 'MàJ marque cabinet',
  clear_cabinet_branding: 'Réinit. marque', upload_cabinet_logo: 'Logo cabinet',
  add_cabinet_domain: 'Ajout domaine', remove_cabinet_domain: 'Retrait domaine',
  add_member: 'Ajout membre', reset_user_password: 'Reset mot de passe',
  change_user_role: 'Changement de rôle', activate_user: 'Activation compte',
  deactivate_user: 'Désactivation compte', reset_mfa: 'Réinitialisation MFA',
  view_user: 'Aperçu utilisateur', create_plan: 'Création plan', update_plan: 'MàJ plan',
  delete_plan: 'Suppression plan', set_plan_features: 'Fonctions du plan',
  create_feature_flag: 'Création feature flag', update_feature_flag: 'MàJ feature flag',
  delete_feature_flag: 'Suppression feature flag', enable_feature_flag: 'Activation flag',
  disable_feature_flag: 'Désactivation flag', set_feature_flag_override: 'Override flag',
  reset_feature_flag_override: 'Reset override', create_framework: 'Création référentiel',
  delete_framework: 'Suppression référentiel', deactivate_framework: 'Désactivation référentiel',
  reactivate_framework: 'Réactivation référentiel', delete_control: 'Suppression contrôle',
}

const PERIOD_OPTIONS = [
  { value: 7, label: '7 jours' },
  { value: 30, label: '30 jours' },
  { value: 90, label: '90 jours' },
  { value: 365, label: '12 mois' },
]

function familyOf(targetType: string): { label: string; variant: Variant } {
  return FAMILY[targetType] ?? OTHER_FAMILY
}
function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

export function AdminAuditLogPage() {
  const [sinceDays, setSinceDays] = useState(30)
  const [actionFilter, setActionFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')
  const [familyFilter, setFamilyFilter] = useState<string | null>(null)
  const { rows, loading, error } = useAdminAuditLog({ sinceDays })

  const kpis = useMemo(() => {
    const now = Date.now()
    let d1 = 0, d7 = 0
    const actors = new Set<string>()
    for (const r of rows) {
      const age = now - new Date(r.created_at).getTime()
      if (age <= 86_400_000) d1++
      if (age <= 7 * 86_400_000) d7++
      actors.add(r.actor_email)
    }
    return { d1, d7, actors: actors.size, total: rows.length }
  }, [rows])

  const families = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of rows) {
      const fam = familyOf(r.target_type).label
      counts.set(fam, (counts.get(fam) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const actionOptions = useMemo(() => [...new Set(rows.map((r) => r.action))].sort(), [rows])
  const actorOptions = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of rows) m.set(r.actor_email, `${r.actor_first_name} ${r.actor_last_name}`)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows])

  const filtered = useMemo(() => rows.filter((r) => {
    if (actionFilter && r.action !== actionFilter) return false
    if (actorFilter && r.actor_email !== actorFilter) return false
    if (familyFilter && familyOf(r.target_type).label !== familyFilter) return false
    return true
  }), [rows, actionFilter, actorFilter, familyFilter])

  const exportCsv = () => {
    const esc = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    const header = ['Quand', 'Acteur', 'Email acteur', 'Action', 'Type cible', 'ID cible', 'Motif', 'Métadonnées']
    const lines = [header.join(',')]
    for (const r of filtered.slice(0, 5000)) {
      lines.push([
        esc(new Date(r.created_at).toISOString()), esc(`${r.actor_first_name} ${r.actor_last_name}`),
        esc(r.actor_email), esc(r.action), esc(r.target_type), esc(r.target_id ?? ''),
        esc(r.reason), esc(JSON.stringify(r.metadata ?? {})),
      ].join(','))
    }
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
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
      <h1 className="text-xl font-bold text-gray-900">Audit &amp; sécurité</h1>
      <p className="text-[12.5px] text-gray-500 mt-1 mb-5 max-w-2xl">
        Toutes les actions super-admin tracées — acteur, motif et horodatage. Journal en insertion seule, rétention indéfinie.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <KpiTile label="Actions 24 h" value={kpis.d1.toString()} accent="gold" />
        <KpiTile label="Actions 7 j" value={kpis.d7.toString()} accent="green" />
        <KpiTile label="Acteurs distincts" value={kpis.actors.toString()} accent="blue" />
        <KpiTile label="Total fenêtre" value={kpis.total.toString()} sub={`${sinceDays} derniers jours`} accent="purple" />
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <select value={sinceDays} onChange={(e) => setSinceDays(Number(e.target.value))} className="text-[12.5px] py-1.5 px-3" style={{ width: 'auto' }}>
          {PERIOD_OPTIONS.map((p) => <option key={p.value} value={p.value}>Période · {p.label}</option>)}
        </select>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="text-[12.5px] py-1.5 px-3" style={{ width: 'auto' }}>
          <option value="">Toutes les actions</option>
          {actionOptions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
        </select>
        <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} className="text-[12.5px] py-1.5 px-3" style={{ width: 'auto' }}>
          <option value="">Tous les acteurs</option>
          {actorOptions.map(([email, name]) => <option key={email} value={email}>{name}</option>)}
        </select>
        <button onClick={exportCsv} disabled={filtered.length === 0} className="ml-auto text-[12px] inline-flex items-center gap-1.5 text-forest-700 font-semibold hover:text-forest-900 disabled:opacity-50">
          <Download size={13} /> Exporter CSV ({filtered.length})
        </button>
      </div>

      {families.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <FilterPill label={`Toutes · ${rows.length}`} active={familyFilter === null} onClick={() => setFamilyFilter(null)} />
          {families.map(([fam, n]) => (
            <FilterPill key={fam} label={`${fam} · ${n}`} active={familyFilter === fam} onClick={() => setFamilyFilter(fam)} />
          ))}
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
          Aucune action ne correspond aux filtres.
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
              {filtered.map((r) => <Row key={r.id} row={r} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const VARIANT_CLASS: Record<Variant, string> = {
  green: 'bg-green-50 text-green-700', warn: 'bg-amber-50 text-amber-700',
  blue: 'bg-blue-50 text-blue-700', gold: 'bg-gold-50 text-gold-600',
  gray: 'bg-gray-100 text-gray-500', red: 'bg-red-50 text-red-700',
  purple: 'bg-purple-50 text-purple-700',
}

function Row({ row }: { row: AuditLogRow }) {
  const fam = familyOf(row.target_type)
  return (
    <tr className="hover:bg-page-bg">
      <td className="px-4 py-3 border-b border-gray-100 font-mono text-[11.5px] text-gray-500 whitespace-nowrap">{formatDateTime(row.created_at)}</td>
      <td className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center text-[9.5px] font-extrabold flex-shrink-0">{row.actor_first_name.charAt(0)}{row.actor_last_name.charAt(0)}</div>
          <span className="text-[12.5px] text-gray-700">{row.actor_first_name} {row.actor_last_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 border-b border-gray-100"><span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${VARIANT_CLASS[fam.variant]}`}>{actionLabel(row.action)}</span></td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-700">
        <span className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mr-1.5">{fam.label}</span>
        {row.metadata && row.metadata.name ? <span className="text-gray-700">{String(row.metadata.name)}</span>
          : row.metadata && row.metadata.email ? <span className="text-gray-700">{String(row.metadata.email)}</span>
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-700 max-w-md truncate" title={row.reason}>{row.reason}</td>
    </tr>
  )
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors ${active ? 'bg-forest-700 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-page-bg'}`}
    >
      {label}
    </button>
  )
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}
