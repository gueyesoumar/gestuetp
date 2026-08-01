import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { ErrorAlert } from '../components/ui/ErrorAlert'
import { PERMISSION_LABELS } from '../features/client-portal/client-constants'

interface EntityContact { id: string; contact_name: string; email: string; job_title: string | null }
interface MissionOption { id: string; name: string }
interface Props {
  entityOrgId: string
  entityName: string
  missions: MissionOption[]
  onClose: () => void
  onSuccess: () => void
}

/** Invitation d'un contact assujetti au portail cloisonné (Gëstu Regul / M7-2). */
export function AssujettiInviteModal({ entityOrgId, entityName, missions, onClose, onSuccess }: Props): JSX.Element {
  const { profile } = useAuth()
  const [contacts, setContacts] = useState<EntityContact[]>([])
  const [access, setAccess] = useState<{ contact_id: string; mission_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [missionId, setMissionId] = useState(missions[0]?.id ?? '')
  const [permission, setPermission] = useState<'viewer' | 'contributor'>('viewer')

  const fetchData = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setLoading(true)
    const { data: cData } = await supabase
      .from('client_portal_contacts')
      .select('id, contact_name, email, job_title')
      .eq('entity_org_id', entityOrgId)
      .order('created_at')
      .abortSignal(signal ?? new AbortController().signal)
    const missionIds = missions.map((m) => m.id)
    const { data: aData } = missionIds.length > 0
      ? await supabase.from('client_mission_access').select('contact_id, mission_id').in('mission_id', missionIds)
      : { data: [] }
    setContacts((cData ?? []) as EntityContact[])
    setAccess((aData ?? []) as { contact_id: string; mission_id: string }[])
    setLoading(false)
  }, [entityOrgId, missions])

  useEffect(() => { const ac = new AbortController(); void fetchData(ac.signal); return () => ac.abort() }, [fetchData])

  const handleInvite = async (): Promise<void> => {
    if (!profile) return
    if (!name.trim() || !email.trim() || !missionId) { setError('Nom, email et mission requis'); return }
    setInviting(true); setError(null)
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    let res: Response
    try {
      res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-assujetti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ assujetti_org_id: entityOrgId, contact_name: name.trim(), email: email.trim(), job_title: jobTitle.trim() || undefined, mission_id: missionId, permission }),
      })
    } catch { setError('Erreur réseau. Vérifiez votre connexion.'); setInviting(false); return }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
      setError((body as { error: string }).error); setInviting(false); return
    }
    const result = await res.json() as { invite_link?: string }
    if (result.invite_link) setInviteLink(result.invite_link)
    setSuccess(`${name.trim()} invité(e). Un email a été envoyé.`)
    setName(''); setEmail(''); setJobTitle('')
    setInviting(false); void fetchData(); onSuccess()
  }

  const missionsFor = (contactId: string): number => access.filter((a) => a.contact_id === contactId).length

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-base font-bold">Contacts &amp; accès portail</h3>
          <p className="text-xs text-gray-400 mt-1">Invitez un contact de &laquo;&nbsp;{entityName}&nbsp;&raquo; à consulter une mission de contrôle.</p>
        </div>

        <div className="p-5">
          {error && <div className="mb-3"><ErrorAlert message={error} /></div>}
          {success && <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">&#10003; {success}</div>}
          {inviteLink && (
            <div className="mb-3 p-3 bg-gold-50 border border-gold-200 rounded-lg">
              <p className="text-[10px] font-semibold text-gold-600 mb-1">Lien d&apos;invitation (secours si l&apos;email échoue)</p>
              <div className="flex gap-2 items-center">
                <input readOnly value={inviteLink} className="flex-1 text-[10px] text-gray-500 bg-white border border-gray-200 rounded px-2 py-1 outline-none" />
                <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="text-[10px] font-medium text-forest-700 bg-forest-50 px-2.5 py-1 rounded shrink-0">Copier</button>
              </div>
            </div>
          )}

          {loading ? <p className="text-xs text-gray-400 text-center py-6">Chargement...</p> : (
            <>
              {contacts.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Contacts existants</p>
                  <div className="space-y-2">
                    {contacts.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {c.contact_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate">{c.contact_name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{c.email}{c.job_title ? ` • ${c.job_title}` : ''}</p>
                        </div>
                        <span className="text-[10px] font-medium text-forest-600 bg-forest-50 px-2 py-0.5 rounded-full shrink-0">{missionsFor(c.id)} mission{missionsFor(c.id) > 1 ? 's' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border border-forest-200 rounded-xl p-4 bg-forest-50/60">
                <p className="text-xs font-semibold mb-3">Inviter un contact</p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet *" className="px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500" />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" type="email" className="px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500" />
                  <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Fonction" className="px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500" />
                  <select value={permission} onChange={(e) => setPermission(e.target.value as 'viewer' | 'contributor')} className="px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500 bg-white">
                    <option value="viewer">{PERMISSION_LABELS.viewer}</option>
                    <option value="contributor">{PERMISSION_LABELS.contributor}</option>
                  </select>
                  <select value={missionId} onChange={(e) => setMissionId(e.target.value)} className="col-span-2 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500 bg-white">
                    {missions.length === 0 && <option value="">Aucune mission de contrôle</option>}
                    {missions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <button onClick={handleInvite} disabled={inviting || missions.length === 0} className="px-4 py-2 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 transition-colors disabled:opacity-50">
                  {inviting ? 'Envoi...' : 'Créer et inviter'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors">Fermer</button>
        </div>
      </div>
    </div>
  )
}
