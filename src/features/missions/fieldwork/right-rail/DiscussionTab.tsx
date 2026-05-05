import { useState, useEffect, useMemo } from 'react'
import { Send, Reply, X, MessageSquare } from 'lucide-react'
import { useAuth } from '../../../../hooks/useAuth'
import { DiscussionCommentItem, authorName } from './DiscussionCommentItem'
import type { ControlComment, UseControlCommentsReturn } from './useControlComments'

interface DiscussionTabProps {
  hook: UseControlCommentsReturn
}

export function DiscussionTab({ hook }: DiscussionTabProps) {
  const { profile } = useAuth()
  const { comments, loading, error, postComment, editComment, deleteComment, markAllRead } = hook
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<ControlComment | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [posting, setPosting] = useState(false)

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

  const startEdit = (c: ControlComment) => { setEditingId(c.id); setEditDraft(c.text) }
  const cancelEdit = () => { setEditingId(null); setEditDraft('') }

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
              <DiscussionCommentItem
                comment={parent}
                isOwn={parent.author_id === profile?.id}
                editingId={editingId}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={handleEdit}
                onDelete={handleDelete}
                onReply={(c) => setReplyTo(c)}
              />
              {replies.length > 0 && (
                <div className="ml-7 space-y-1.5 border-l-2 border-forest-100 pl-3">
                  {replies.map((r) => (
                    <DiscussionCommentItem
                      key={r.id}
                      comment={r}
                      isOwn={r.author_id === profile?.id}
                      editingId={editingId}
                      editDraft={editDraft}
                      setEditDraft={setEditDraft}
                      onStartEdit={startEdit}
                      onCancelEdit={cancelEdit}
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
