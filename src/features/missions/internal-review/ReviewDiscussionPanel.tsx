import { useState, useRef, useEffect } from 'react'
import { Send, MessageSquare, Trash2, Loader2 } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import { useMissionReviewComments } from './useMissionReviewComments'
import type { ReviewComment } from './useMissionReviewComments'

interface ReviewDiscussionPanelProps {
  missionId: string
}

function authorInitials(c: ReviewComment): string {
  const fn = c.author?.first_name ?? ''
  const ln = c.author?.last_name ?? ''
  return ((fn[0] ?? '') + (ln[0] ?? '')).toUpperCase() || '?'
}

function authorName(c: ReviewComment): string {
  const fn = c.author?.first_name ?? ''
  const ln = c.author?.last_name ?? ''
  const full = `${fn} ${ln}`.trim()
  return full || c.author?.email || 'Utilisateur'
}

function fmtTime(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function ReviewDiscussionPanel({ missionId }: ReviewDiscussionPanelProps) {
  const { profile } = useAuth()
  const { comments, loading, postComment, deleteComment, unreadCount, markAllRead } = useMissionReviewComments(missionId)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current && comments.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments.length])

  useEffect(() => {
    if (unreadCount > 0) markAllRead()
  }, [unreadCount, markAllRead])

  const handleSend = async (): Promise<void> => {
    const text = draft.trim()
    if (!text) return
    setPosting(true)
    const ok = await postComment(text)
    setPosting(false)
    if (ok) setDraft('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col" style={{ maxHeight: '560px' }}>
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-700 flex items-center justify-center shrink-0">
          <MessageSquare size={15} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-gray-900">Discussion revue</h3>
          <p className="text-[11px] text-gray-400">Échange entre lead et associé sur la cohérence d'ensemble</p>
        </div>
        <span className="text-[11px] text-gray-400">{comments.length} message{comments.length > 1 ? 's' : ''}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="text-forest-700 animate-spin" />
          </div>
        )}
        {!loading && comments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare size={24} className="text-gray-300 mb-2" />
            <p className="text-[12px] text-gray-400">Aucun message pour le moment.</p>
            <p className="text-[10px] text-gray-300 mt-0.5">Démarrez la discussion sur la revue d'ensemble.</p>
          </div>
        )}
        {!loading && comments.map((c) => {
          const isMine = c.author_id === profile?.id
          return (
            <div key={c.id} className={`flex gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${isMine ? 'bg-forest-700 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {authorInitials(c)}
              </div>
              <div className={`flex-1 min-w-0 ${isMine ? 'text-right' : ''}`}>
                <div className={`flex items-center gap-2 mb-0.5 ${isMine ? 'justify-end' : ''}`}>
                  <span className="text-[11px] font-semibold text-gray-700">{authorName(c)}</span>
                  <span className="text-[10px] text-gray-400">{fmtTime(c.created_at)}</span>
                </div>
                <div className={`inline-block px-3 py-2 rounded-2xl text-[12px] leading-relaxed text-left max-w-[85%] ${
                  isMine ? 'bg-forest-700 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{c.text}</p>
                </div>
                {isMine && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => void deleteComment(c.id)}
                      className="text-[10px] text-gray-300 hover:text-red-500 inline-flex items-center gap-1"
                    >
                      <Trash2 size={10} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-100 px-3 py-2 bg-[#FAFAFA]">
        <div className="flex gap-2 items-end">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre message... (⌘+Enter pour envoyer)"
            disabled={posting}
            rows={2}
            className="flex-1 resize-none border border-gray-200 rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-forest-500 focus:ring-2 focus:ring-forest-100 bg-white"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={posting || draft.trim().length === 0}
            className="bg-forest-700 text-white px-3 py-2 rounded-lg hover:bg-forest-900 disabled:opacity-50 inline-flex items-center"
            aria-label="Envoyer"
          >
            {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          </button>
        </div>
      </div>
    </div>
  )
}
