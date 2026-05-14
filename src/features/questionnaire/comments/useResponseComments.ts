import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../hooks/useAuth'

export interface ResponseComment {
  id: string
  instance_id: string
  question_code: string
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

export interface UseResponseCommentsReturn {
  comments: ResponseComment[]
  countByQuestion: Map<string, number>
  loading: boolean
  error: string | null
  postComment: (questionCode: string, text: string, parentId?: string | null) => Promise<boolean>
  editComment: (id: string, text: string) => Promise<boolean>
  deleteComment: (id: string) => Promise<boolean>
  refetch: () => Promise<void>
}

const TABLE = 'questionnaire_response_comments'

export function useResponseComments(instanceId: string | null): UseResponseCommentsReturn {
  const { profile } = useAuth()
  const [comments, setComments] = useState<ResponseComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async (): Promise<void> => {
    if (!instanceId) {
      setComments([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await supabase.from(TABLE)
      .select(`
        id, instance_id, question_code, author_id, parent_id, text, mentioned_user_ids,
        created_at, updated_at, deleted_at,
        author:users!author_id(first_name, last_name, email, job_title)
      `)
      .eq('instance_id', instanceId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (result.error) {
      console.error('[useResponseComments] fetch:', result.error.message)
      setError('Erreur de chargement des commentaires')
      setLoading(false)
      return
    }
    setComments((result.data ?? []) as unknown as ResponseComment[])
    setLoading(false)
  }, [instanceId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const postComment = useCallback(async (
    questionCode: string,
    text: string,
    parentId?: string | null,
  ): Promise<boolean> => {
    if (!instanceId || !profile?.id) return false
    const trimmed = text.trim()
    if (trimmed.length === 0 || trimmed.length > 5000) return false
    const result = await supabase.from(TABLE)
      .insert({
        instance_id: instanceId,
        question_code: questionCode,
        author_id: profile.id,
        parent_id: parentId ?? null,
        text: trimmed,
        mentioned_user_ids: [],
      } as never)
      .select(`
        id, instance_id, question_code, author_id, parent_id, text, mentioned_user_ids,
        created_at, updated_at, deleted_at,
        author:users!author_id(first_name, last_name, email, job_title)
      `)
      .single() as unknown as { error: { message: string } | null; data: ResponseComment | null }
    if (result.error) {
      console.error('[useResponseComments] post:', result.error.message)
      setError('Erreur de publication')
      return false
    }
    if (result.data) {
      setComments((prev) => [...prev, result.data as unknown as ResponseComment])
    }
    return true
  }, [instanceId, profile?.id])

  const editComment = useCallback(async (id: string, text: string): Promise<boolean> => {
    const trimmed = text.trim()
    if (trimmed.length === 0 || trimmed.length > 5000) return false
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, text: trimmed } : c)))
    const result = await supabase.from(TABLE).update({ text: trimmed } as never).eq('id', id)
    if (result.error) {
      console.error('[useResponseComments] edit:', result.error.message)
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
      console.error('[useResponseComments] delete:', result.error.message)
      setError('Erreur de suppression')
      setComments(previous)
      return false
    }
    return true
  }, [comments])

  const countByQuestion = new Map<string, number>()
  for (const c of comments) {
    countByQuestion.set(c.question_code, (countByQuestion.get(c.question_code) ?? 0) + 1)
  }

  return { comments, countByQuestion, loading, error, postComment, editComment, deleteComment, refetch }
}
