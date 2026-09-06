import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export interface ClientContact {
  id: string
  user_id: string | null
  name: string
  email: string
  job_title: string | null
}

// Fetches portal contacts for the audited org (RFC 0007 P2 : cpc.client_org_id unifié).
export function useClientContacts(clientOrgId: string | null | undefined) {
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!clientOrgId) { setLoading(false); return }
    const ac = new AbortController()
    setLoading(true)
    void (async () => {
      const { data, error } = await supabase
        .from('client_portal_contacts')
        .select('id, user_id, name, email, job_title')
        .eq('client_org_id', clientOrgId)
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
