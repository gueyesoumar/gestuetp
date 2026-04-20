import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'
import { ErrorAlert } from '../../../components/ui/ErrorAlert'
import { PERMISSION_LABELS } from '../../client-portal/client-constants'
import type { ClientPortalContact, ClientPermission } from '../../../types/database.types'

interface PortalInviteModalProps {
  missionId: string
  cabinetClientId: string
  onClose: () => void
  onSuccess: () => void
}

export function PortalInviteModal({ missionId, cabinetClientId, onClose, onSuccess }: PortalInviteModalProps): JSX.Element {
  const { profile } = useAuth()
  const [contacts, setContacts] = useState<ClientPortalContact[]>([])
  const [accessList, setAccessList] = useState<{ contact_id: string; permission: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // New contact form
  const [showForm, setShowForm] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [permission, setPermission] = useState<ClientPermission>('contributor')

  const fetchData = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setLoading(true)

    // Fetch existing portal contacts for this cabinet client
    const { data: contactsData } = await supabase
      .from('client_portal_contacts')
      .select('*')
      .eq('cabinet_client_id', cabinetClientId)
      .order('created_at')
      .abortSignal(signal ?? new AbortController().signal)

    // Fetch existing access for this mission
    const { data: accessData } = await supabase
      .from('client_mission_access')
      .select('contact_id, permission')
      .eq('mission_id', missionId)
      .abortSignal(signal ?? new AbortController().signal)

    setContacts((contactsData ?? []) as unknown as ClientPortalContact[])
    setAccessList((accessData ?? []) as { contact_id: string; permission: string }[])
    setLoading(false)
  }, [cabinetClientId, missionId])

  useEffect(() => {
    const ac = new AbortController()
    fetchData(ac.signal)
    return () => ac.abort()
  }, [fetchData])

  const handleInvite = async (contactId: string, contactName: string, contactEmail: string): Promise<void> => {
    if (!profile) return
    setInviting(true)
    setError(null)

    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    let res: Response
    try {
      res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        cabinet_client_id: cabinetClientId,
        contact_name: contactName,
        email: contactEmail,
        mission_id: missionId,
        permission,
      }),
      })
    } catch {
      setError('Erreur r\u00e9seau. V\u00e9rifiez votre connexion.')
      setInviting(false)
      return
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
      setError((body as { error: string }).error)
      setInviting(false)
      return
    }

    const result = await res.json() as { invite_link?: string }
    if (result.invite_link) {
      setInviteLink(result.invite_link)
    }

    setSuccess(`${contactName} invit\u00e9(e) avec succ\u00e8s. Un email a \u00e9t\u00e9 envoy\u00e9.`)
    setInviting(false)
    fetchData()
    onSuccess()
  }

  const handleCreateAndInvite = async (): Promise<void> => {
    if (!name.trim() || !email.trim()) {
      setError('Nom et email requis')
      return
    }
    await handleInvite('', name.trim(), email.trim())
    setShowForm(false)
    setName('')
    setEmail('')
    setJobTitle('')
    setPhone('')
  }

  const hasAccess = (contactId: string): boolean => accessList.some((a) => a.contact_id === contactId)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-base font-bold">Acc{'\u00e8'}s portail client</h3>
          <p className="text-xs text-gray-400 mt-1">Invitez des contacts {'\u00e0'} acc{'\u00e9'}der au portail pour cette mission</p>
        </div>

        <div className="p-5">
          {error && <div className="mb-3"><ErrorAlert message={error} /></div>}
          {success && (
            <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              {'\u2713'} {success}
            </div>
          )}
          {inviteLink && (
            <div className="mb-3 p-3 bg-gold-50 border border-gold-200 rounded-lg">
              <p className="text-[10px] font-semibold text-gold-600 mb-1">Lien d{'\u2019'}invitation (en cas de probl{'\u00e8'}me email)</p>
              <div className="flex gap-2 items-center">
                <input readOnly value={inviteLink} className="flex-1 text-[10px] text-gray-500 bg-white border border-gray-200 rounded px-2 py-1 outline-none" />
                <button onClick={() => { navigator.clipboard.writeText(inviteLink); }} className="text-[10px] font-medium text-forest-700 bg-forest-50 px-2.5 py-1 rounded hover:bg-forest-100 transition-colors shrink-0">
                  Copier
                </button>
              </div>
            </div>
          )}

          {/* Existing contacts */}
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-8">Chargement...</p>
          ) : (
            <>
              {contacts.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Contacts existants</p>
                  <div className="space-y-2">
                    {contacts.map((c) => {
                      const alreadyInvited = hasAccess(c.id)
                      return (
                        <div key={c.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {c.contact_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{c.contact_name}</p>
                            <p className="text-[10px] text-gray-300 truncate">{c.email}{c.job_title ? ` \u2022 ${c.job_title}` : ''}</p>
                          </div>
                          {alreadyInvited ? (
                            <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full shrink-0">{'\u2713'} Acc{'\u00e8'}s</span>
                          ) : (
                            <button
                              onClick={() => handleInvite(c.id, c.contact_name, c.email)}
                              disabled={inviting}
                              className="text-[11px] font-medium text-forest-700 bg-forest-50 px-3 py-1.5 rounded-lg hover:bg-forest-100 transition-colors shrink-0 disabled:opacity-50"
                            >
                              Inviter
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* New contact form */}
              {showForm ? (
                <div className="border border-forest-200 rounded-xl p-4 bg-forest-50">
                  <p className="text-xs font-semibold mb-3">Nouveau contact</p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet *"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500" />
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" type="email"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500" />
                    <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Fonction"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500" />
                    <select value={permission} onChange={(e) => setPermission(e.target.value as ClientPermission)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-forest-500 bg-white">
                      <option value="contributor">{PERMISSION_LABELS.contributor}</option>
                      <option value="viewer">{PERMISSION_LABELS.viewer}</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateAndInvite} disabled={inviting}
                      className="px-4 py-2 bg-forest-700 text-white rounded-lg text-xs font-semibold hover:bg-forest-900 transition-colors disabled:opacity-50">
                      Cr{'\u00e9'}er et inviter
                    </button>
                    <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs text-gray-500">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowForm(true)}
                  className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-forest-300 hover:text-forest-700 transition-colors">
                  + Ajouter un nouveau contact
                </button>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
