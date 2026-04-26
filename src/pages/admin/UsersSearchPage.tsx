import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useAdminUsers, type AdminUserRow } from '../../features/admin/useAdminUsers'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'

export function UsersSearchPage() {
  const [query, setQuery] = useState('')
  const { users, loading } = useAdminUsers(query)
  const [actionUser, setActionUser] = useState<AdminUserRow | null>(null)
  const [actionType, setActionType] = useState<'reset_password' | 'toggle_active' | null>(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const submit = async () => {
    if (!actionUser || !actionType || !reason.trim()) return
    setSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user', {
        body: { action: actionType, user_id: actionUser.id, reason },
      })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      toast.success(
        actionType === 'reset_password' ? 'Lien de réinitialisation envoyé' : 'Statut mis à jour',
        { description: actionUser.email },
      )
      setActionUser(null)
      setActionType(null)
      setReason('')
    } catch (err) {
      toast.error('Action impossible', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="px-7 py-6">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[11.5px] text-gray-500"><b className="text-forest-900 font-semibold">Admin</b> &rsaquo; Utilisateurs</span>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Recherche utilisateur</h1>
      <p className="text-[12.5px] text-gray-500 mb-5">Recherche cross-cabinet par email, prénom ou nom. Actions safes : réinitialiser le mot de passe, désactiver le compte.</p>

      <div className="relative max-w-lg mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Email, nom, prénom (min. 2 caractères)…"
          className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-[12.5px] w-full bg-page-bg"
          autoFocus
        />
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : query.trim().length < 2 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
          Saisissez au moins 2 caractères pour lancer la recherche.
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-6 py-12 text-center text-[12.5px] text-gray-300">
          Aucun utilisateur ne correspond.
        </div>
      ) : (
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
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-page-bg">
                  <td className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center font-extrabold text-[10.5px]">{u.first_name.charAt(0)}{u.last_name.charAt(0)}</div>
                      <div>
                        <div className="font-semibold text-gray-900 text-[12.5px]">{u.first_name} {u.last_name}</div>
                        <div className="text-[11px] text-gray-300">{u.email}</div>
                      </div>
                      {u.is_platform_owner && <span className="ml-2 text-[9.5px] uppercase tracking-wider font-bold bg-gold-50 text-gold-600 px-1.5 py-0.5 rounded">Owner</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-[12px] text-gray-700">{u.organization_name}</td>
                  <td className="px-4 py-3 border-b border-gray-100"><span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{u.role === 'auditor' ? 'Auditeur' : 'Référent client'}</span></td>
                  <td className="px-4 py-3 border-b border-gray-100 text-[11.5px] text-gray-500">{formatRelative(u.last_sign_in_at)}</td>
                  <td className="px-4 py-3 border-b border-gray-100">
                    {u.is_active ? <span className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-semibold">Actif</span> : <span className="text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-semibold">Désactivé</span>}
                  </td>
                  <td className="px-4 py-3 border-b border-gray-100 text-right">
                    <UserMenu user={u} onPickAction={(t) => { setActionUser(u); setActionType(t); setReason('') }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {actionUser && actionType && (
        <ActionModal
          title={actionType === 'reset_password' ? `Réinitialiser le mot de passe de ${actionUser.email} ?` : actionUser.is_active ? `Désactiver ${actionUser.email} ?` : `Réactiver ${actionUser.email} ?`}
          submitLabel={actionType === 'reset_password' ? 'Envoyer le lien' : actionUser.is_active ? 'Désactiver' : 'Réactiver'}
          danger={actionType === 'toggle_active' && actionUser.is_active}
          reason={reason}
          onChangeReason={setReason}
          submitting={submitting}
          onCancel={() => { setActionUser(null); setActionType(null); setReason('') }}
          onSubmit={submit}
        />
      )}
    </div>
  )
}

function UserMenu({ user, onPickAction }: { user: AdminUserRow; onPickAction: (action: 'reset_password' | 'toggle_active') => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen((v) => !v)} className="w-7 h-7 rounded-md border border-gray-200 bg-white hover:bg-page-bg text-gray-500 inline-flex items-center justify-center font-bold">⋯</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-40" />
          <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            <Link
              to={`/admin/utilisateurs/${user.id}`}
              onClick={() => setOpen(false)}
              className="block w-full text-left px-3 py-2 text-[12.5px] hover:bg-page-bg text-gray-700"
            >
              Inspecter (aperçu)
            </Link>
            <div className="border-t border-gray-100" />
            <button
              onClick={() => { setOpen(false); onPickAction('reset_password') }}
              className="block w-full text-left px-3 py-2 text-[12.5px] hover:bg-page-bg text-gray-700"
            >
              Réinitialiser le mot de passe
            </button>
            {!user.is_platform_owner && (
              <button
                onClick={() => { setOpen(false); onPickAction('toggle_active') }}
                className={`block w-full text-left px-3 py-2 text-[12.5px] hover:bg-page-bg ${user.is_active ? 'text-red-700' : 'text-green-700'}`}
              >
                {user.is_active ? 'Désactiver le compte' : 'Réactiver le compte'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
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
