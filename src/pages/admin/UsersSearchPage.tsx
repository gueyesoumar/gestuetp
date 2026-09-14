import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAdminUsers, type AdminUserRow } from '../../features/admin/useAdminUsers'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorAlert } from '../../components/ui/ErrorAlert'
import { KpiTile } from '../../features/admin/dashboard/KpiTile'
import { ChangeRoleModal } from '../../features/admin/users/ChangeRoleModal'
import { supabase } from '../../lib/supabase'
import { readInvokeError } from '../../lib/edgeError'
import { useToast } from '../../hooks/useToast'

type RoleFilter = 'all' | 'auditor' | 'client' | 'owner'
type StatusFilter = 'all' | 'active' | 'inactive'
type SimpleAction = 'reset_password' | 'toggle_active' | 'reset_mfa'

const SUCCESS_MSG: Record<SimpleAction, string> = {
  reset_password: 'Lien de réinitialisation envoyé',
  toggle_active: 'Statut mis à jour',
  reset_mfa: 'MFA réinitialisée',
}

export function UsersSearchPage() {
  const { users, loading, error, refetch } = useAdminUsers()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const toast = useToast()

  const [actionUser, setActionUser] = useState<AdminUserRow | null>(null)
  const [actionType, setActionType] = useState<SimpleAction | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [roleUser, setRoleUser] = useState<AdminUserRow | null>(null)

  const counts = useMemo(() => {
    let auditor = 0, client = 0, owner = 0, active = 0, inactive = 0
    for (const u of users) {
      if (u.role === 'auditor') auditor++; else if (u.role === 'client') client++
      if (u.is_platform_owner) owner++
      if (u.is_active) active++; else inactive++
    }
    return { total: users.length, auditor, client, owner, active, inactive }
  }, [users])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter === 'owner' && !u.is_platform_owner) return false
      if (roleFilter === 'auditor' && u.role !== 'auditor') return false
      if (roleFilter === 'client' && u.role !== 'client') return false
      if (statusFilter === 'active' && !u.is_active) return false
      if (statusFilter === 'inactive' && u.is_active) return false
      if (q && !u.email.toLowerCase().includes(q) && !u.first_name.toLowerCase().includes(q) &&
        !u.last_name.toLowerCase().includes(q) && !(u.organization_name ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [users, query, roleFilter, statusFilter])

  const closeAction = () => { setActionUser(null); setActionType(null); setReason('') }

  const submit = async () => {
    if (!actionUser || !actionType || !reason.trim()) return
    setSubmitting(true)
    try {
      const fn = actionType === 'reset_mfa' ? 'admin-reset-mfa' : 'admin-user'
      const body = actionType === 'reset_mfa'
        ? { email: actionUser.email, reason }
        : { action: actionType, user_id: actionUser.id, reason }
      const { data, error: invErr } = await supabase.functions.invoke(fn, { body })
      if (invErr || data?.error) throw new Error(await readInvokeError(invErr, data, 'Action impossible'))
      toast.success(SUCCESS_MSG[actionType], { description: actionUser.email })
      closeAction()
      refetch()
    } catch (err) {
      toast.error('Action impossible', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8"><LoadingSpinner /></div>
  if (error) return <div className="p-8"><ErrorAlert message={error} /></div>

  return (
    <div className="px-7 py-6">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[11.5px] text-gray-500"><b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Utilisateurs</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900">Utilisateurs</h1>
      <p className="text-[12.5px] text-gray-500 mt-1 mb-5 max-w-2xl">
        Tous les comptes, cross-cabinet. Filtrez par rôle et statut ; agissez avec motif tracé (mot de passe, activation, MFA, rôle plateforme).
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-5">
        <KpiTile label="Total" value={counts.total.toString()} sub={`${counts.active} actifs`} accent="gold" />
        <KpiTile label="Auditeurs" value={counts.auditor.toString()} accent="green" />
        <KpiTile label="Référents client" value={counts.client.toString()} accent="blue" />
        <KpiTile label="Owners" value={counts.owner.toString()} accent="purple" />
        <KpiTile label="Désactivés" value={counts.inactive.toString()} accent="gold" />
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <RoleSegment value={roleFilter} counts={counts} onChange={setRoleFilter} />
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <FilterPill label={`Actifs · ${counts.active}`} active={statusFilter === 'active'} onClick={() => setStatusFilter('active')} variant="green" />
          <FilterPill label={`Désactivés · ${counts.inactive}`} active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')} variant="warn" />
          <FilterPill label={`Tous · ${counts.total}`} active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} variant="gray" />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un utilisateur…"
              className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[12.5px] w-64 bg-page-bg"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-page-bg text-[10.5px] uppercase tracking-wider text-gray-300 font-semibold">
              <th className="text-left px-4 py-3 border-b border-gray-200">Utilisateur</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Cabinet / Org</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Rôle</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Dernière connexion</th>
              <th className="text-left px-4 py-3 border-b border-gray-200">Statut</th>
              <th className="px-4 py-3 border-b border-gray-200" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-300 text-[12px]">Aucun utilisateur ne correspond.</td></tr>
            ) : (
              filtered.map((u) => (
                <UserRow
                  key={u.id}
                  user={u}
                  onPickAction={(t) => { setActionUser(u); setActionType(t); setReason('') }}
                  onChangeRole={() => setRoleUser(u)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {actionUser && actionType && (
        <ActionModal
          title={actionTitle(actionType, actionUser)}
          submitLabel={actionSubmitLabel(actionType, actionUser)}
          danger={actionType === 'toggle_active' && actionUser.is_active}
          reason={reason}
          onChangeReason={setReason}
          submitting={submitting}
          onCancel={closeAction}
          onSubmit={submit}
        />
      )}

      {roleUser && (
        <ChangeRoleModal user={roleUser} onClose={() => setRoleUser(null)} onDone={() => { setRoleUser(null); refetch() }} />
      )}
    </div>
  )
}

function actionTitle(type: SimpleAction, u: AdminUserRow): string {
  if (type === 'reset_password') return `Réinitialiser le mot de passe de ${u.email} ?`
  if (type === 'reset_mfa') return `Réinitialiser la MFA de ${u.email} ?`
  return u.is_active ? `Désactiver ${u.email} ?` : `Réactiver ${u.email} ?`
}

function actionSubmitLabel(type: SimpleAction, u: AdminUserRow): string {
  if (type === 'reset_password') return 'Envoyer le lien'
  if (type === 'reset_mfa') return 'Réinitialiser la MFA'
  return u.is_active ? 'Désactiver' : 'Réactiver'
}

function UserRow({ user, onPickAction, onChangeRole }: { user: AdminUserRow; onPickAction: (t: SimpleAction) => void; onChangeRole: () => void }) {
  return (
    <tr className="hover:bg-page-bg">
      <td className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center font-extrabold text-[10.5px] flex-shrink-0">{user.first_name.charAt(0)}{user.last_name.charAt(0)}</div>
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 text-[12.5px]">{user.first_name} {user.last_name}</div>
            <div className="text-[11px] text-gray-300 truncate">{user.email}</div>
          </div>
          {user.is_platform_owner && <span className="ml-1 text-[9.5px] uppercase tracking-wider font-bold bg-gold-50 text-gold-600 px-1.5 py-0.5 rounded flex-shrink-0">Owner</span>}
        </div>
      </td>
      <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-700">{user.organization_name}</td>
      <td className="px-4 py-3 border-b border-gray-100">
        <RolePill role={user.role} />
      </td>
      <td className="px-4 py-3 border-b border-gray-100 text-[11.5px] text-gray-500">{formatRelative(user.last_sign_in_at)}</td>
      <td className="px-4 py-3 border-b border-gray-100">
        {user.is_active
          ? <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">Actif</span>
          : <span className="text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold">Désactivé</span>}
      </td>
      <td className="px-4 py-3 border-b border-gray-100 text-right">
        <UserMenu user={user} onPickAction={onPickAction} onChangeRole={onChangeRole} />
      </td>
    </tr>
  )
}

function RolePill({ role }: { role: 'auditor' | 'client' }) {
  return role === 'auditor'
    ? <span className="text-[11px] bg-forest-100 text-forest-700 px-2 py-0.5 rounded-full font-semibold">Auditeur</span>
    : <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold">Référent client</span>
}

function RoleSegment({ value, counts, onChange }: { value: RoleFilter; counts: { total: number; auditor: number; client: number; owner: number }; onChange: (v: RoleFilter) => void }) {
  const items: Array<{ key: RoleFilter; label: string; n: number }> = [
    { key: 'all', label: 'Tous', n: counts.total },
    { key: 'auditor', label: 'Auditeurs', n: counts.auditor },
    { key: 'client', label: 'Clients', n: counts.client },
    { key: 'owner', label: 'Owners', n: counts.owner },
  ]
  return (
    <div className="inline-flex items-center bg-white border border-gray-200 rounded-lg p-1 gap-1 flex-wrap">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${value === it.key ? 'bg-forest-700 text-white' : 'text-gray-500 hover:bg-page-bg'}`}
        >
          {it.label} <span className={value === it.key ? 'opacity-70' : 'text-gray-300'}>{it.n}</span>
        </button>
      ))}
    </div>
  )
}

function FilterPill({ label, active, onClick, variant }: { label: string; active: boolean; onClick: () => void; variant: 'green' | 'warn' | 'gray' }) {
  const colors = active
    ? variant === 'green' ? 'bg-forest-700 text-white' : variant === 'warn' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-white'
    : variant === 'green' ? 'bg-green-50 text-green-700 border border-green-200' : variant === 'warn' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
  return (
    <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors ${colors}`}>
      {label}
    </button>
  )
}

function UserMenu({ user, onPickAction, onChangeRole }: { user: AdminUserRow; onPickAction: (action: SimpleAction) => void; onChangeRole: () => void }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setOpen((v) => !v)
  }
  const pick = (fn: () => void) => { setOpen(false); fn() }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="w-7 h-7 rounded-md border border-gray-200 bg-white hover:bg-page-bg text-gray-500 inline-flex items-center justify-center font-bold"
      >⋯</button>
      {open && pos && createPortal(
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-[60]" />
          <div style={{ position: 'fixed', top: pos.top, right: pos.right }} className="w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-[70] overflow-hidden py-1">
            <Link to={`/admin/utilisateurs/${user.id}`} onClick={() => setOpen(false)} className="block w-full text-left px-3 py-2 text-[12.5px] hover:bg-page-bg text-gray-700">Inspecter (aperçu)</Link>
            <div className="border-t border-gray-100 my-1" />
            <button onClick={() => pick(() => onPickAction('reset_password'))} className="block w-full text-left px-3 py-2 text-[12.5px] hover:bg-page-bg text-gray-700">Réinitialiser le mot de passe</button>
            <button onClick={() => pick(onChangeRole)} className="block w-full text-left px-3 py-2 text-[12.5px] hover:bg-page-bg text-gray-700">Changer le rôle plateforme</button>
            <button onClick={() => pick(() => onPickAction('reset_mfa'))} className="block w-full text-left px-3 py-2 text-[12.5px] hover:bg-page-bg text-gray-700">Réinitialiser la MFA</button>
            {!user.is_platform_owner && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button onClick={() => pick(() => onPickAction('toggle_active'))} className={`block w-full text-left px-3 py-2 text-[12.5px] hover:bg-page-bg ${user.is_active ? 'text-red-700' : 'text-green-700'}`}>
                  {user.is_active ? 'Désactiver le compte' : 'Réactiver le compte'}
                </button>
              </>
            )}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

function ActionModal({ title, submitLabel, danger, reason, onChangeReason, submitting, onCancel, onSubmit }: {
  title: string; submitLabel: string; danger?: boolean; reason: string; onChangeReason: (v: string) => void; submitting: boolean; onCancel: () => void; onSubmit: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-[14.5px] font-bold text-gray-900">{title}</h3>
        </div>
        <div className="px-5 py-4">
          <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Motif <span className="text-red-500">*</span></label>
          <textarea value={reason} onChange={(e) => onChangeReason(e.target.value)} rows={3} placeholder="Pourquoi cette action ? (obligatoire)" className="w-full" disabled={submitting} />
          <p className="mt-2 text-[11px] text-gray-400">Le motif est tracé dans l&apos;audit log.</p>
        </div>
        <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onCancel} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button
            onClick={onSubmit}
            disabled={submitting || !reason.trim()}
            className={`px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-forest-700 hover:bg-forest-900'}`}
          >
            {submitting ? 'En cours…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'jamais'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR')
}
