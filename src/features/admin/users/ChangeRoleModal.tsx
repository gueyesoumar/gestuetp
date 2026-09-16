import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { readInvokeError } from '../../../lib/edgeError'
import { useToast } from '../../../hooks/useToast'
import type { AdminUserRow } from '../useAdminUsers'

interface PlatformRole { id: string; name: string; is_default: boolean }

/**
 * Change le rôle PLATEFORME (permissions) d'un utilisateur — distinct du type
 * auditeur/client de la liste. Charge le catalogue de rôles de l'organisation
 * cible (RLS owner-select, mig 00237) + l'attribution courante, puis délègue à
 * l'Edge Function admin-user (action change_role, motif obligatoire, audit log).
 */
export function ChangeRoleModal({ user, onClose, onDone }: { user: AdminUserRow; onClose: () => void; onDone: () => void }) {
  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [currentRoleId, setCurrentRoleId] = useState<string | null>(null)
  const [selected, setSelected] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  useEffect(() => {
    const abort = new AbortController()
    void (async () => {
      const { data: roleRows, error: rErr } = await supabase
        .from('platform_roles')
        .select('id, name, is_default')
        .eq('organization_id', user.organization_id)
        .order('name')
        .abortSignal(abort.signal)
      if (abort.signal.aborted) return
      if (rErr) { console.error('[ChangeRoleModal] roles:', rErr.message); setLoading(false); return }
      const { data: cur } = await supabase
        .from('user_platform_roles')
        .select('platform_role_id')
        .eq('user_id', user.id)
        .limit(1)
        .abortSignal(abort.signal)
      if (abort.signal.aborted) return
      const currentId = (cur?.[0] as { platform_role_id: string } | undefined)?.platform_role_id ?? null
      setRoles((roleRows ?? []) as PlatformRole[])
      setCurrentRoleId(currentId)
      setSelected(currentId ?? '')
      setLoading(false)
    })()
    return () => abort.abort()
  }, [user.id, user.organization_id])

  const canSubmit = !!selected && !!reason.trim() && selected !== currentRoleId && !submitting && !loading

  const submit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-user', {
        body: { action: 'change_role', user_id: user.id, new_role_id: selected, reason },
      })
      if (error || data?.error) throw new Error(await readInvokeError(error, data, 'Changement impossible'))
      toast.success('Rôle mis à jour', { description: user.email })
      onDone()
    } catch (err) {
      toast.error('Changement impossible', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-[14.5px] font-bold text-gray-900">Changer le rôle plateforme</h3>
          <p className="text-[11.5px] text-gray-500 mt-0.5">{user.first_name} {user.last_name} · {user.organization_name}</p>
        </div>
        <div className="px-5 py-4">
          {loading ? (
            <p className="text-[12.5px] text-gray-400">Chargement des rôles…</p>
          ) : roles.length === 0 ? (
            <p className="text-[12.5px] text-gray-500">Aucun rôle plateforme défini pour cette organisation.</p>
          ) : (
            <>
              <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Rôle de permissions</label>
              <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full mb-1" disabled={submitting}>
                <option value="" disabled>Choisir un rôle…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}{r.id === currentRoleId ? ' (actuel)' : ''}</option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mb-3">Distinct du type auditeur/client : ce rôle porte les permissions dans l&apos;organisation. Effet à la prochaine reconnexion.</p>
              <label className="block text-[11px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Motif <span className="text-red-500">*</span></label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Pourquoi ce changement ? (obligatoire)" className="w-full" disabled={submitting} />
              <p className="mt-2 text-[11px] text-gray-400">Le motif est tracé dans l&apos;audit log.</p>
            </>
          )}
        </div>
        <div className="px-5 py-3 bg-page-bg border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} disabled={submitting} className="px-3.5 py-2 text-[12.5px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
          <button onClick={submit} disabled={!canSubmit} className="px-3.5 py-2 text-[12.5px] font-semibold rounded-lg text-white bg-forest-700 hover:bg-forest-900 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'En cours…' : 'Changer le rôle'}
          </button>
        </div>
      </div>
    </div>
  )
}
