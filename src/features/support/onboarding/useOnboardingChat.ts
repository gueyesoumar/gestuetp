import { useCallback, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

// Client de streaming (SSE) de l'assistant d'onboarding (RFC 0011, Lot 2).
// Appel direct par fetch (le helper invokeEdgeFunction est bloquant) avec le jeton
// de session + apikey, puis lecture incrementale du flux text/event-stream.

export interface ChatMessage { role: 'user' | 'assistant'; text: string }

interface SendOpts { route?: string; module?: string; deep?: boolean }

export interface OnboardingChatState {
  messages: ChatMessage[]
  streaming: boolean
  pendingTour: string | null
  error: string | null
  send: (question: string, opts?: SendOpts) => Promise<void>
  reset: () => void
  clearTour: () => void
}

export function useOnboardingChat(): OnboardingChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [pendingTour, setPendingTour] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  const convIdRef = useRef<string | null>(null)

  const commit = useCallback((next: ChatMessage[]): void => {
    messagesRef.current = next
    setMessages(next)
  }, [])

  const appendToLastAssistant = useCallback((chunk: string): void => {
    const cur = messagesRef.current
    if (cur.length === 0) return
    const next = cur.slice()
    const last = next[next.length - 1]
    if (last.role === 'assistant') next[next.length - 1] = { role: 'assistant', text: last.text + chunk }
    commit(next)
  }, [commit])

  const send = useCallback(async (question: string, opts?: SendOpts): Promise<void> => {
    const q = question.trim()
    if (!q || streaming) return
    setError(null)
    setPendingTour(null)

    const history = messagesRef.current
    commit([...history, { role: 'user', text: q }, { role: 'assistant', text: '' }])
    setStreaming(true)

    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) { setError('Session expirée. Reconnectez-vous.'); setStreaming(false); return }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onboarding-assistant`, {
        method: 'POST',
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history, route: opts?.route, module: opts?.module, deep: opts?.deep, conversation_id: convIdRef.current }),
      })

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null)
        setError((body as { error?: string } | null)?.error ?? 'Assistant indisponible.')
        appendToLastAssistant('Désolé, je ne peux pas répondre pour le moment.')
        setStreaming(false)
        return
      }

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let idx: number
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const line = buf.slice(0, idx).split('\n').find((l) => l.startsWith('data:'))
          buf = buf.slice(idx + 2)
          if (!line) continue
          const ds = line.slice(5).trim()
          if (!ds) continue
          let ev: { type?: string; text?: string; tour_id?: string; conversation_id?: string; message?: string }
          try { ev = JSON.parse(ds) } catch { continue }
          if (ev.type === 'delta' && ev.text) appendToLastAssistant(ev.text)
          else if (ev.type === 'notice' && ev.text) appendToLastAssistant(`\n\n${ev.text}`)
          else if (ev.type === 'tour' && ev.tour_id) setPendingTour(ev.tour_id)
          else if (ev.type === 'done') convIdRef.current = ev.conversation_id ?? convIdRef.current
          else if (ev.type === 'error') setError(ev.message ?? 'Une erreur est survenue.')
        }
      }
    } catch (err) {
      console.error('onboarding chat:', err instanceof Error ? err.message : String(err))
      setError('Connexion interrompue.')
    } finally {
      setStreaming(false)
    }
  }, [streaming, commit, appendToLastAssistant])

  const reset = useCallback((): void => { convIdRef.current = null; commit([]); setError(null); setPendingTour(null) }, [commit])
  const clearTour = useCallback((): void => setPendingTour(null), [])

  return { messages, streaming, pendingTour, error, send, reset, clearTour }
}
