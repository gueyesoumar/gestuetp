import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'

export interface ReviewComment {
  id: string
  mission_id: string
  author_id: string | null
  text: string
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

export interface UseMissionReviewCommentsReturn {
  comments: ReviewComment[]
  loading: boolean
  error: string | null
  postComment: (text: string) => Promise<boolean>
  deleteComment: (id: string) => Promise<boolean>
  refetch: () => Promise<void>
  unreadCount: number
  markAllRead: () => void
}

const TABLE = 'control_comments'

function lastReadKey(missionId: string): string {
  return `gestu:review-comments-read:${missionId}`
}

export function useMissionReviewComments(missionId: string | null): UseMissionReviewCommentsReturn {
  const { profile } = useAuth()
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastReadAt, setLastReadAt] = useState<string | null>(null)

  useEffect(() => {
    if (!missionId) return
    try {
      const stored = localStorage.getItem(lastReadKey(missionId))
      setLastReadAt(stored)
    } catch { /* ignore */ }
  }, [missionId])

  const refetch = useCallback(async (): Promise<void> => {
    if (!missionId) {
      setComments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await supabase.from(TABLE)
      .select(`
        id, mission_id, author_id, text, created_at, updated_at, deleted_at,
        author:users!author_id(first_name, last_name, email, job_title)
      `)
      .eq('mission_id', missionId)
      .is('control_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (result.error) {
      console.error('[useMissionReviewComments] fetch:', result.error.message)
      setError('Erreur de chargement des commentaires')
      setLoading(false)
      return
    }
    setComments((result.data ?? []) as ReviewComment[])
    setLoading(false)
  }, [missionId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const postComment = useCallback(async (text: string): Promise<boolean> => {
    if (!missionId || !profile?.id) return false
    const trimmed = text.trim()
    if (trimmed.length === 0 || trimmed.length > 5000) return false
    const result = await (supabase.from(TABLE) as unknown as {
      insert: (v: Record<string, unknown>) => { select: (q: string) => { single: () => Promise<{ data: ReviewComment | null; error: { message: string } | null }> } }
    })
      .insert({
        mission_id: missionId,
        control_id: null,
        author_id: profile.id,
        parent_id: null,
        text: trimmed,
        mentioned_user_ids: [],
      })
      .select(`
        id, mission_id, author_id, text, created_at, updated_at, deleted_at,
        author:users!author_id(first_name, last_name, email, job_title)
      `)
      .single()
    if (result.error) {
      console.error('[useMissionReviewComments] post:', result.error.message)
      setError('Erreur de publication')
      return false
    }
    if (result.data) {
      setComments((prev) => [...prev, result.data as ReviewComment])
    }
    return true
  }, [missionId, profile?.id])

  const deleteComment = useCallback(async (id: string): Promise<boolean> => {
    const previous = comments
    setComments((prev) => prev.filter((c) => c.id !== id))
    const result = await (supabase.from(TABLE) as unknown as {
      update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> }
    }).update({ deleted_at: new Date().toISOString() }).eq('id', id)
    if (result.error) {
      console.error('[useMissionReviewComments] delete:', result.error.message)
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
    if (!missionId) return
    const now = new Date().toISOString()
    try {
      localStorage.setItem(lastReadKey(missionId), now)
    } catch { /* ignore */ }
    setLastReadAt(now)
  }, [missionId])

  return { comments, loading, error, postComment, deleteComment, refetch, unreadCount, markAllRead }
}
