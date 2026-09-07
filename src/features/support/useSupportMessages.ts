import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export interface SupportMessageView {
  id: string
  authorId: string
  authorName: string
  body: string
  createdAt: string
}

interface UseSupportMessages {
  messages: SupportMessageView[]
  loading: boolean
  posting: boolean
  error: string | null
  post: (body: string) => Promise<boolean>
  refetch: () => Promise<void>
}

export function useSupportMessages(requestId: string): UseSupportMessages {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<SupportMessageView[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setError(null)
    const { data, error: e } = await supabase
      .from('support_messages')
      .select('id, author_user_id, author_name, body, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true })
      .abortSignal(signal ?? new AbortController().signal)
    if (signal?.aborted) return
    if (e) {
      console.error('support_messages:', e.message)
      setError('Impossible de charger la conversation.')
      setLoading(false)
      return
    }
    setMessages((data ?? []).map((r) => ({
      id: r.id,
      authorId: r.author_user_id,
      authorName: r.author_name ?? 'Utilisateur',
      body: r.body,
      createdAt: r.created_at,
    })))
    setLoading(false)
  }, [requestId])

  useEffect(() => {
    const ctrl = new AbortController()
    void fetchMessages(ctrl.signal)
    return () => ctrl.abort()
  }, [fetchMessages])

  const post = useCallback(async (body: string): Promise<boolean> => {
    const text = body.trim()
    if (!text || !profile) return false
    setPosting(true); setError(null)
    const { error: e } = await supabase
      .from('support_messages')
      .insert({ request_id: requestId, author_user_id: profile.id, body: text })
    setPosting(false)
    if (e) {
      console.error('support_messages insert:', e.message)
      setError('Envoi impossible. Réessayez.')
      return false
    }
    await fetchMessages()
    return true
  }, [requestId, profile, fetchMessages])

  return { messages, loading, posting, error, post, refetch: fetchMessages }
}
