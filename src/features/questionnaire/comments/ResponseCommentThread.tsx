import { useState } from 'react'
import { Send, X, MessageSquare } from 'lucide-react'
import { useAuth } from '../../../hooks/useAuth'
import type { ResponseComment, UseResponseCommentsReturn } from './useResponseComments'

interface ResponseCommentThreadProps {
  questionCode: string
  hook: UseResponseCommentsReturn
  onClose?: () => void
  variant?: 'inline' | 'popover'
}

function relativeTime(iso: string): string {
  const now = Date.now()
  const t = new Date(iso).getTime()
  const sec = Math.round((now - t) / 1000)
  if (sec < 60) return 'à l’instant'
  const min = Math.round(sec / 60)
  if (min < 60) return `il y a ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.round(h / 24)
  if (d < 7) return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function authorInitials(c: ResponseComment): string {
  const first = c.author?.first_name?.[0] ?? ''
  const last = c.author?.last_name?.[0] ?? ''
  if (first || last) return (first + last).toUpperCase()
  return c.author?.email?.[0]?.toUpperCase() ?? '?'
}

function authorName(c: ResponseComment): string {
  const parts = [c.author?.first_name, c.author?.last_name].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  return c.author?.email ?? 'Utilisateur'
}

export function ResponseCommentThread({ questionCode, hook, onClose, variant = 'popover' }: ResponseCommentThreadProps) {
  const { profile } = useAuth()
  const { comments, error, postComment } = hook
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  const filtered = comments.filter((c) => c.question_code === questionCode)

  const handlePost = async () => {
    if (draft.trim().length === 0) return
    setPosting(true)
    const ok = await postComment(questionCode, draft, null)
    setPosting(false)
    if (ok) setDraft('')
  }

  const isPopover = variant === 'popover'

  return (
    <div className={
      isPopover
        ? 'absolute right-0 top-full mt-1 w-80 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden'
        : 'mt-2 bg-info-50 border border-info-200 rounded-lg overflow-hidden'
    } style={isPopover ? undefined : { background: '#EFF6FF', borderColor: '#BFDBFE' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-[#FAFAF8]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700">
          <MessageSquare size={11} />
          <span>Discussion · {questionCode}</span>
          <span className="text-gray-400 font-normal">· {filtered.length}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-0.5" aria-label="Fermer">
            <X size={12} />
          </button>
        )}
      </div>

      <div className="max-h-[280px] overflow-y-auto p-3 space-y-2">
        {error && (
          <div className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded p-1.5">{error}</div>
        )}
        {filtered.length === 0 ? (
          <p className="text-[11px] text-gray-400 italic text-center py-4">
            Aucun commentaire. Lancez la discussion ci-dessous.
          </p>
        ) : (
          filtered.map((c) => {
            const isOwn = c.author_id === profile?.id
            return (
              <div key={c.id} className="flex items-start gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white shrink-0 ${
                  isOwn ? 'bg-forest-500' : 'bg-forest-700'
                }`}>
                  {authorInitials(c)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-gray-900">{authorName(c)}</span>
                    <span className="text-[9px] text-gray-400">{relativeTime(c.created_at)}</span>
                  </div>
                  <p className="text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap mt-0.5">{c.text}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-gray-200 p-2 bg-white">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Votre commentaire..."
          rows={2}
          className="w-full px-2 py-1.5 border border-gray-200 rounded text-[11px] outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-200 resize-y"
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-gray-400">{draft.length} / 5000</span>
          <button
            type="button"
            onClick={() => void handlePost()}
            disabled={posting || draft.trim().length === 0}
            className="text-[10px] font-semibold text-white bg-forest-700 px-2.5 py-1 rounded hover:bg-forest-900 disabled:opacity-50 inline-flex items-center gap-1"
          >
            <Send size={10} /> Publier
          </button>
        </div>
      </div>
    </div>
  )
}
