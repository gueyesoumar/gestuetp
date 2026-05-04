import { useState, useEffect, useMemo } from 'react'
import { Send, Trash2, Pencil, Reply, X, MessageSquare } from 'lucide-react'
import { useAuth } from '../../../../hooks/useAuth'
import type { ControlComment, UseControlCommentsReturn } from './useControlComments'

interface DiscussionTabProps {
  hook: UseControlCommentsReturn
}

const EDIT_WINDOW_MIN = 15

function relativeTime(iso: string): string {
  const now = Date.now()
  const t = new Date(iso).getTime()
  const diffSec = Math.round((now - t) / 1000)
  if (diffSec < 60) return 'a l’instant'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `il y a ${diffMin} min`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `il y a ${diffH} h`
  const diffD = Math.round(diffH / 24)
  if (diffD < 7) return `il y a ${diffD} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function authorInitials(c: ControlComment): string {
  const first = c.author?.first_name?.[0] ?? ''
  const last = c.author?.last_name?.[0] ?? ''
  if (first || last) return (first + last).toUpperCase()
  return c.author?.email?.[0]?.toUpperCase() ?? '?'
}

function authorName(c: ControlComment): string {
  const parts = [c.author?.first_name, c.author?.last_name].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  return c.author?.email ?? 'Utilisateur'
}

function withinEditWindow(c: ControlComment): boolean {
  const created = new Date(c.created_at).getTime()
  return Date.now() - created < EDIT_WINDOW_MIN * 60 * 1000
}

export function DiscussionTab({ hook }: DiscussionTabProps) {
  const { profile } = useAuth()
  const { comments, loading, error, postComment, editComment, deleteComment, markAllRead } = hook
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<ControlComment | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [posting, setPosting] = useState(false)

  // Mark all as read when this tab is mounted
  useEffect(() => {
    markAllRead()
  }, [markAllRead, comments.length])

  const threads = useMemo(() => {
    const parents = comments.filter((c) => !c.parent_id)
    return parents.map((p) => ({
      parent: p,
      replies: comments.filter((c) => c.parent_id === p.id),
    }))
  }, [comments])

  const handlePost = async () => {
    if (draft.trim().length === 0) return
    setPosting(true)
    const ok = await postComment(draft, replyTo?.id ?? null)
    setPosting(false)
    if (ok) {
      setDraft('')
      setReplyTo(null)
    }
  }

  const handleEdit = async (id: string) => {
    if (editDraft.trim().length === 0) return
    const ok = await editComment(id, editDraft)
    if (ok) {
      setEditingId(null)
      setEditDraft('')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce commentaire ?')) return
    await deleteComment(id)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {error && (
          <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</div>
        )}

        {loading ? (
          <p className="text-[11px] text-gray-400 italic text-center py-6">Chargement...</p>
        ) : threads.length === 0 ? (
          <div className="text-center py-8 text-[11px] text-gray-400">
            <MessageSquare size={20} className="mx-auto mb-2 text-gray-300" />
            <p>Aucun commentaire pour ce contr&ocirc;le.</p>
            <p className="mt-1 text-gray-300">Lancez la discussion ci-dessous.</p>
          </div>
        ) : (
          threads.map(({ parent, replies }) => (
            <div key={parent.id} className="space-y-1.5">
              <CommentItem
                comment={parent}
                isOwn={parent.author_id === profile?.id}
                editingId={editingId}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                onStartEdit={(c) => { setEditingId(c.id); setEditDraft(c.text) }}
                onCancelEdit={() => { setEditingId(null); setEditDraft('') }}
                onSaveEdit={handleEdit}
                onDelete={handleDelete}
                onReply={(c) => setReplyTo(c)}
              />
              {replies.length > 0 && (
                <div className="ml-7 space-y-1.5 border-l-2 border-forest-100 pl-3">
                  {replies.map((r) => (
                    <CommentItem
                      key={r.id}
                      comment={r}
                      isOwn={r.author_id === profile?.id}
                      editingId={editingId}
                      editDraft={editDraft}
                      setEditDraft={setEditDraft}
                      onStartEdit={(c) => { setEditingId(c.id); setEditDraft(c.text) }}
                      onCancelEdit={() => { setEditingId(null); setEditDraft('') }}
                      onSaveEdit={handleEdit}
                      onDelete={handleDelete}
                      onReply={null}
                      isReply
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-gray-200 p-3 bg-white space-y-2">
        {replyTo && (
          <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-gray-50 border border-gray-200 rounded px-2 py-1.5">
            <Reply size={11} />
            <span className="flex-1 truncate">R&eacute;pondre &agrave; <strong>{authorName(replyTo)}</strong></span>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-700">
              <X size={11} />
            </button>
          </div>
        )}
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="&Eacute;crire un commentaire..."
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-forest-500 focus:ring-1 focus:ring-forest-200 resize-y"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{draft.length} / 5000</span>
          <button
            type="button"
            onClick={() => void handlePost()}
            disabled={posting || draft.trim().length === 0}
            className="text-[11px] font-semibold text-white bg-forest-700 px-3 py-1.5 rounded-lg hover:bg-forest-900 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <Send size={11} /> Publier
          </button>
        </div>
      </div>
    </div>
  )
}

interface CommentItemProps {
  comment: ControlComment
  isOwn: boolean
  isReply?: boolean
  editingId: string | null
  editDraft: string
  setEditDraft: (v: string) => void
  onStartEdit: (c: ControlComment) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReply: ((c: ControlComment) => void) | null
}

function CommentItem({ comment, isOwn, isReply, editingId, editDraft, setEditDraft, onStartEdit, onCancelEdit, onSaveEdit, onDelete, onReply }: CommentItemProps) {
  const isEditing = editingId === comment.id
  const canEdit = isOwn && withinEditWindow(comment)

  return (
    <div className="flex items-start gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white shrink-0 ${
        isOwn ? 'bg-forest-500' : 'bg-forest-700'
      }`}>
        {authorInitials(comment)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-900">{authorName(comment)}</span>
          {comment.author?.job_title && (
            <span className="text-[9px] text-gray-400">{comment.author.job_title}</span>
          )}
          <span className="text-[9px] text-gray-400">{relativeTime(comment.created_at)}</span>
          {comment.created_at !== comment.updated_at && (
            <span className="text-[9px] text-gray-300 italic">(modifi&eacute;)</span>
          )}
        </div>
        {isEditing ? (
          <div className="mt-1 space-y-1.5">
            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 border border-forest-300 rounded text-[12px] outline-none focus:ring-1 focus:ring-forest-200"
              autoFocus
            />
            <div className="flex items-center gap-1.5">
              <button onClick={() => void onSaveEdit(comment.id)} className="text-[10px] font-semibold text-white bg-forest-700 px-2 py-1 rounded">
                Enregistrer
              </button>
              <button onClick={onCancelEdit} className="text-[10px] text-gray-500 px-2 py-1">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-wrap mt-0.5">{comment.text}</p>
        )}
        {!isEditing && (
          <div className="flex items-center gap-2 mt-1">
            {!isReply && onReply && (
              <button onClick={() => onReply(comment)} className="text-[10px] text-gray-400 hover:text-forest-700 inline-flex items-center gap-1">
                <Reply size={10} /> R&eacute;pondre
              </button>
            )}
            {canEdit && (
              <>
                <button onClick={() => onStartEdit(comment)} className="text-[10px] text-gray-400 hover:text-forest-700 inline-flex items-center gap-1">
                  <Pencil size={10} /> &Eacute;diter
                </button>
                <button onClick={() => void onDelete(comment.id)} className="text-[10px] text-gray-400 hover:text-red-600 inline-flex items-center gap-1">
                  <Trash2 size={10} /> Supprimer
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
