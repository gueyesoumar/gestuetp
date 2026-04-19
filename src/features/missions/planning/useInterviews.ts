import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { InterviewScheduleInsert, InterviewScheduleUpdate, ClientContactInsert } from '../../../types/database.types'

// Helper type: Supabase generated types resolve to `never` for new tables
type SupabaseResult = { error: { message: string } | null }
type SupabaseResultWithData<T> = { data: T | null; error: { message: string } | null }

function fromTable(name: string): unknown {
  return supabase.from(name as 'missions')
}

interface UseInterviewsResult {
  createInterview: (data: InterviewScheduleInsert) => Promise<boolean>
  updateInterview: (id: string, data: InterviewScheduleUpdate) => Promise<boolean>
  deleteInterview: (id: string) => Promise<boolean>
  createContact: (data: ClientContactInsert) => Promise<string | null>
  saving: boolean
  error: string | null
}

export function useInterviews(onSuccess?: () => void): UseInterviewsResult {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createInterview = useCallback(async (data: InterviewScheduleInsert): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const { error: insertError } = await (fromTable('interview_schedules') as { insert: (v: Record<string, unknown>) => Promise<SupabaseResult> }).insert(data as unknown as Record<string, unknown>)
    if (insertError) {
      console.error('createInterview:', insertError.message)
      setError('Erreur lors de la cr\u00e9ation de l\u2019entretien.')
      setSaving(false)
      return false
    }
    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  const updateInterview = useCallback(async (id: string, data: InterviewScheduleUpdate): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const { error: updateError } = await (fromTable('interview_schedules') as {
      update: (v: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<SupabaseResult> }
    }).update(data as unknown as Record<string, unknown>).eq('id', id)
    if (updateError) {
      console.error('updateInterview:', updateError.message)
      setError('Erreur lors de la mise \u00e0 jour.')
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
    const { error: delError } = await (fromTable('interview_schedules') as {
      delete: () => { eq: (col: string, val: string) => Promise<SupabaseResult> }
    }).delete().eq('id', id)
    if (delError) {
      console.error('deleteInterview:', delError.message)
      setError('Erreur lors de la suppression.')
      setSaving(false)
      return false
    }
    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  const createContact = useCallback(async (data: ClientContactInsert): Promise<string | null> => {
    setSaving(true)
    setError(null)
    const { data: result, error: insertError } = await (fromTable('client_contacts') as {
      insert: (v: Record<string, unknown>) => { select: (cols: string) => { single: () => Promise<SupabaseResultWithData<{ id: string }>> } }
    }).insert(data as unknown as Record<string, unknown>).select('id').single()
    if (insertError || !result) {
      console.error('createContact:', insertError?.message)
      setError('Erreur lors de la cr\u00e9ation du contact.')
      setSaving(false)
      return null
    }
    setSaving(false)
    onSuccess?.()
    return result.id
  }, [onSuccess])

  return { createInterview, updateInterview, deleteInterview, createContact, saving, error }
}
