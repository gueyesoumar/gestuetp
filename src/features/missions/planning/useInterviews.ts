import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { InterviewScheduleInsert, InterviewScheduleUpdate } from '../../../types/database.types'

// Le client Supabase v2 type emet "never" pour les inserts sur les tables de
// ce projet (PostgrestVersion 12 + types non synchronises). On utilise des
// casts unknown comme dans le reste du codebase (cf useSavePlanning).

type SupaResult = { error: { message: string } | null }
type SupaResultWithData<T> = { data: T | null; error: { message: string } | null }

interface CreateRelations {
  topicIds?: string[]
  actorIds?: string[]
}

interface UseInterviewsResult {
  createInterview: (data: InterviewScheduleInsert, relations?: CreateRelations) => Promise<boolean>
  updateInterview: (id: string, data: InterviewScheduleUpdate) => Promise<boolean>
  deleteInterview: (id: string) => Promise<boolean>
  saving: boolean
  error: string | null
}

export function useInterviews(onSuccess?: () => void): UseInterviewsResult {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInterview = useCallback(async (data: InterviewScheduleInsert, relations?: CreateRelations): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const ins = await (supabase.from('interview_schedules') as unknown as {
      insert: (v: Record<string, unknown>) => { select: (cols: string) => { single: () => Promise<SupaResultWithData<{ id: string }>> } }
    }).insert(data as unknown as Record<string, unknown>).select('id').single()
    if (ins.error || !ins.data) {
      console.error('createInterview:', ins.error?.message)
      setError('Erreur lors de la création de l’entretien.')
      setSaving(false)
      return false
    }
    const interviewId = ins.data.id

    if (relations?.topicIds && relations.topicIds.length > 0) {
      const tIns = await (supabase.from('interview_topics') as unknown as {
        insert: (v: Record<string, unknown>[]) => Promise<SupaResult>
      }).insert(relations.topicIds.map((tid) => ({ interview_id: interviewId, topic_id: tid })))
      if (tIns.error) console.error('createInterview topics:', tIns.error.message)
    }
    if (relations?.actorIds && relations.actorIds.length > 0) {
      const aIns = await (supabase.from('interview_actors') as unknown as {
        insert: (v: Record<string, unknown>[]) => Promise<SupaResult>
      }).insert(relations.actorIds.map((aid) => ({ interview_id: interviewId, actor_id: aid })))
      if (aIns.error) console.error('createInterview actors:', aIns.error.message)
    }
    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  const updateInterview = useCallback(async (id: string, data: InterviewScheduleUpdate): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const up = await (supabase.from('interview_schedules') as unknown as {
      update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<SupaResult> }
    }).update(data as unknown as Record<string, unknown>).eq('id', id)
    if (up.error) {
      console.error('updateInterview:', up.error.message)
      setError('Erreur lors de la mise à jour.')
      setSaving(false)
      return false
    }
    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  const deleteInterview = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const del = await (supabase.from('interview_schedules') as unknown as {
      delete: () => { eq: (col: string, val: string) => Promise<SupaResult> }
    }).delete().eq('id', id)
    if (del.error) {
      console.error('deleteInterview:', del.error.message)
      setError('Erreur lors de la suppression.')
      setSaving(false)
      return false
    }
    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { createInterview, updateInterview, deleteInterview, saving, error }
}
