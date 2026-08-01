import { Trash2, Pencil, Reply } from 'lucide-react'
import type { ControlComment } from './useControlComments'

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

export function authorName(c: ControlComment): string {
  const parts = [c.author?.first_name, c.author?.last_name].filter(Boolean)
  if (parts.length > 0) return parts.join(' ')
  return c.author?.email ?? 'Utilisateur'
}

function withinEditWindow(c: ControlComment): boolean {
  const created = new Date(c.created_at).getTime()
  return Date.now() - created < EDIT_WINDOW_MIN * 60 * 1000
}

interface DiscussionCommentItemProps {
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

export function DiscussionCommentItem({
  comment,
  isOwn,
  isReply,
  editingId,
  editDraft,
  setEditDraft,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onReply,
}: DiscussionCommentItemProps) {
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
