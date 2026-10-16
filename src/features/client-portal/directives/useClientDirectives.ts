import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'

export interface ClientDirective {
  id: string
  description: string
  due_date: string | null
  status: string
  verification_status: string
  client_response: string | null
  client_responded_at: string | null
  created_at: string
}

export interface DirectiveEvidence {
  id: string
  file_path: string
  file_name: string
  created_at: string
}

interface Result {
  directives: ClientDirective[]
  loading: boolean
  error: string | null
  respond: (id: string, status: 'in_progress' | 'done', note: string) => Promise<{ ok: boolean; error?: string }>
  listEvidence: (id: string) => Promise<DirectiveEvidence[]>
  uploadEvidence: (id: string, file: File) => Promise<{ ok: boolean; error?: string }>
  signedUrl: (path: string) => Promise<string | null>
  refetch: () => void
}

/** Directives du régulateur vues et traitées depuis le portail assujetti (RLS cp_rta_select + RPC). */
export function useClientDirectives(): Result {
  const { profile } = useAuth()
  const [directives, setDirectives] = useState<ClientDirective[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)
  const refetch = useCallback(() => setKey((k) => k + 1), [])

  useEffect(() => {
    const ac = new AbortController()
    setLoading(true)
    setError(null)
    void (async () => {
      const { data, error: e } = await supabase
        .from('risk_treatment_actions')
        .select('id,description,due_date,status,verification_status,client_response,client_responded_at,created_at')
        .eq('origin', 'supervisor_directive')
        .order('created_at', { ascending: false })
        .abortSignal(ac.signal)
      if (ac.signal.aborted) return
      if (e) { console.error('[useClientDirectives]', e.message); setError('Chargement des directives impossible.'); setLoading(false); return }
      setDirectives((data ?? []) as unknown as ClientDirective[])
      setLoading(false)
    })()
    return () => ac.abort()
  }, [key])

  const respond = useCallback(async (id: string, status: 'in_progress' | 'done', note: string) => {
    const { error: e } = await supabase.rpc('respond_risk_directive', { p_action: id, p_status: status, p_note: note || null })
    if (e) { console.error('[respond_risk_directive]', e.message); return { ok: false, error: 'Réponse impossible.' } }
    refetch()
    return { ok: true }
  }, [refetch])

  const listEvidence = useCallback(async (id: string): Promise<DirectiveEvidence[]> => {
    const { data, error: e } = await supabase.rpc('get_directive_evidence', { p_action: id })
    if (e) { console.error('[get_directive_evidence]', e.message); return [] }
    return (data ?? []) as unknown as DirectiveEvidence[]
  }, [])

  const uploadEvidence = useCallback(async (id: string, file: File) => {
    if (!profile) return { ok: false, error: 'Session expirée.' }
    const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_')
    const path = `risk-directives/${id}/${Date.now()}_${safe}`
    const { error: se } = await supabase.storage.from('documents').upload(path, file)
    if (se) { console.error('[directive evidence storage]', se.message); return { ok: false, error: 'Téléversement impossible.' } }
    const { error: e } = await supabase.rpc('add_directive_evidence', { p_action: id, p_path: path, p_name: file.name })
    if (e) { console.error('[add_directive_evidence]', e.message); return { ok: false, error: 'Enregistrement de la preuve impossible.' } }
    return { ok: true }
  }, [profile])

  const signedUrl = useCallback(async (path: string): Promise<string | null> => {
    const { data, error: e } = await supabase.storage.from('documents').createSignedUrl(path, 120)
    if (e) { console.error('[directive signed url]', e.message); return null }
    return data?.signedUrl ?? null
  }, [])

  return { directives, loading, error, respond, listEvidence, uploadEvidence, signedUrl, refetch }
}
