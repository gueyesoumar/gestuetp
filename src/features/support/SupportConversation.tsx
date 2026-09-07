import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSupportMessages } from './useSupportMessages'

interface Props {
  requestId: string
  requesterId: string
}

/** Fil de conversation d'un ticket support : messages + composer de réponse. */
export function SupportConversation({ requestId, requesterId }: Props): JSX.Element {
  const { profile } = useAuth()
  const { messages, loading, posting, error, post } = useSupportMessages(requestId)
  const [draft, setDraft] = useState('')

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault()
    const ok = await post(draft)
    if (ok) setDraft('')
  }

  return (
    <div className="border-t border-gray-100 p-4">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Conversation</p>

      {loading ? (
        <p className="text-[13px] text-gray-400">Chargement&hellip;</p>
      ) : messages.length === 0 ? (
        <p className="text-[13px] text-gray-400">Aucun message. Démarrez la conversation ci-dessous.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const mine = m.authorId === profile?.id
            const fromRequester = m.authorId === requesterId
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[80%]">
                  <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${
                    mine ? 'rounded-br-md bg-forest-700 text-white' : 'rounded-bl-md bg-gray-100 text-gray-900'
                  }`}>
                    {m.body}
                  </div>
                  <div className={`mt-1 flex gap-1.5 text-[11px] text-gray-400 ${mine ? 'justify-end' : ''}`}>
                    <span className={fromRequester ? '' : 'font-medium text-forest-700'}>
                      {fromRequester ? m.authorName : `${m.authorName} · Support`}
                    </span>
                    <span>&middot; {new Date(m.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <form onSubmit={submit} className="mt-4 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder="Écrire une réponse…"
          className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-[13px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100"
        />
        <button
          type="submit"
          disabled={posting || !draft.trim()}
          className="rounded-lg bg-forest-700 px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-forest-900 disabled:opacity-50"
        >
          {posting ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>
      {error && <p className="mt-2 text-[12px]" style={{ color: 'var(--color-error)' }}>{error}</p>}
    </div>
  )
}
