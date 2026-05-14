import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useAuth } from '../../../../hooks/useAuth'

export interface ControlComment {
  id: string
  mission_id: string
  control_id: string
  // null when the original author has been deleted (preserves audit trail)
  author_id: string | null
  parent_id: string | null
  text: string
  mentioned_user_ids: string[]
  created_at: string
  updated_at: string
  deleted_at: string | null
  author: {
    first_name: string | null
    last_name: string | null
    email: string
    job_title: string | null
  } | null
}

export interface UseControlCommentsReturn {
  comments: ControlComment[]
  loading: boolean
  error: string | null
  postComment: (text: string, parentId?: string | null) => Promise<boolean>
  editComment: (id: string, text: string) => Promise<boolean>
  deleteComment: (id: string) => Promise<boolean>
  refetch: () => Promise<void>
  unreadCount: number
  markAllRead: () => void
}

const TABLE = 'control_comments'

function lastReadKey(missionId: string, controlId: string): string {
  return `gestu:control-comments-read:${missionId}:${controlId}`
}

export function useControlComments(missionId: string | null, controlId: string | null): UseControlCommentsReturn {
  const { profile } = useAuth()
  const [comments, setComments] = useState<ControlComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastReadAt, setLastReadAt] = useState<string | null>(null)

  // Hydrate last read timestamp
  useEffect(() => {
    if (!missionId || !controlId) return
    try {
      const stored = localStorage.getItem(lastReadKey(missionId, controlId))
      setLastReadAt(stored)
    } catch { /* ignore */ }
  }, [missionId, controlId])

  const refetch = useCallback(async (): Promise<void> => {
    if (!missionId || !controlId) {
      setComments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await supabase.from(TABLE)
      .select(`
        id, mission_id, control_id, author_id, parent_id, text, mentioned_user_ids,
        created_at, updated_at, deleted_at,
        author:users!author_id(first_name, last_name, email, job_title)
      `)
      .eq('mission_id', missionId)
      .eq('control_id', controlId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (result.error) {
      console.error('[useControlComments] fetch:', result.error.message)
      setError('Erreur de chargement des commentaires')
      setLoading(false)
      return
    }
    setComments((result.data ?? []) as ControlComment[])
    setLoading(false)
  }, [missionId, controlId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const postComment = useCallback(async (text: string, parentId?: string | null): Promise<boolean> => {
    if (!missionId || !controlId || !profile?.id) return false
    const trimmed = text.trim()
    if (trimmed.length === 0 || trimmed.length > 5000) return false
    const result = await supabase.from(TABLE)
      .insert({
        mission_id: missionId,
        control_id: controlId,
        author_id: profile.id,
        parent_id: parentId ?? null,
        text: trimmed,
        mentioned_user_ids: [],
      } as never)
      .select(`
        id, mission_id, control_id, author_id, parent_id, text, mentioned_user_ids,
        created_at, updated_at, deleted_at,
        author:users!author_id(first_name, last_name, email, job_title)
      `)
      .single() as unknown as { error: { message: string } | null; data: ControlComment | null }
    if (result.error) {
      console.error('[useControlComments] post:', result.error.message)
      setError('Erreur de publication')
      return false
    }
    if (result.data) {
      setComments((prev) => [...prev, result.data as ControlComment])
    }
    return true
  }, [missionId, controlId, profile?.id])

  const editComment = useCallback(async (id: string, text: string): Promise<boolean> => {
    const trimmed = text.trim()
    if (trimmed.length === 0 || trimmed.length > 5000) return false
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, text: trimmed } : c)))
    const result = await supabase.from(TABLE).update({ text: trimmed }).eq('id', id)
    if (result.error) {
      console.error('[useControlComments] edit:', result.error.message)
      setError("Erreur d'enregistrement")
      void refetch()
      return false
    }
    return true
  }, [refetch])

  const deleteComment = useCallback(async (id: string): Promise<boolean> => {
    const previous = comments
    setComments((prev) => prev.filter((c) => c.id !== id))
    const result = await supabase.from(TABLE).update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (result.error) {
      console.error('[useControlComments] delete:', result.error.message)
      setError('Erreur de suppression')
      setComments(previous)
      return false
    }
    return true
  }, [comments])

  const unreadCount = useMemo(() => {
    if (!lastReadAt || !profile?.id) return 0
    return comments.filter((c) => c.author_id !== profile.id && c.created_at > lastReadAt).length
  }, [comments, lastReadAt, profile?.id])

  const markAllRead = useCallback(() => {
    if (!missionId || !controlId) return
    const now = new Date().toISOString()
    try {
      localStorage.setItem(lastReadKey(missionId, controlId), now)
    } catch { /* ignore */ }
    setLastReadAt(now)
  }, [missionId, controlId])

  return { comments, loading, error, postComment, editComment, deleteComment, refetch, unreadCount, markAllRead }
}
