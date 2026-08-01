import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export interface ClientContact {
  id: string
  user_id: string | null
  name: string
  email: string
  job_title: string | null
}

// Resolves cabinet_client_id from clientOrgId (mission.client_id) and fetches contacts.
export function useClientContacts(clientOrgId: string | null | undefined) {
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientOrgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data: cc } = await supabase
        .from('cabinet_clients')
        .select('id')
        .eq('client_org_id', clientOrgId)
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      const cabinetClientIds = (cc ?? []).map((c) => (c as { id: string }).id)
      if (cabinetClientIds.length === 0) {
        setContacts([])
        setLoading(false)
        return
      }
      const { data, error } = await supabase
        .from('client_portal_contacts')
        .select('id, user_id, name, email, job_title')
        .in('cabinet_client_id', cabinetClientIds)
        .order('name')
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (error) {
        console.error('[useClientContacts]', error.message)
        setContacts([])
      } else {
        setContacts((data ?? []) as unknown as ClientContact[])
      }
      setLoading(false)
    })()
    return () => ac.abort()
  }, [clientOrgId])

  return { contacts, loading }
}
