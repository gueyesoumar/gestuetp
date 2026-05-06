import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

// Le client Supabase v2 type emet "never" pour les inserts sur les tables de
// ce projet — on utilise des casts unknown comme dans le reste du codebase.

type SupaResult = { error: { message: string } | null }

interface UseInterviewRelationsResult {
  syncTopics: (interviewId: string, topicIds: string[]) => Promise<boolean>
  syncActors: (interviewId: string, actorIds: string[]) => Promise<boolean>
  saving: boolean
  error: string | null
}

// Synchronise les liens M:N (interview_topics, interview_actors) avec un set
// d'IDs : insere les nouveaux, supprime ceux qui ne sont plus selectionnes.
export function useInterviewRelations(): UseInterviewRelationsResult {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncTopics = useCallback(async (interviewId: string, topicIds: string[]): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const { data: existing, error: selErr } = await supabase
      .from('interview_topics')
      .select('topic_id')
      .eq('interview_id', interviewId)
    if (selErr) {
      console.error('[useInterviewRelations] syncTopics select:', selErr.message)
      setError('Erreur lors de la synchronisation des sujets')
      setSaving(false)
      return false
    }
    const existingIds = new Set((existing ?? []).map((r) => (r as { topic_id: string }).topic_id))
    const wanted = new Set(topicIds)
    const toInsert = topicIds.filter((id) => !existingIds.has(id))
    const toDelete = [...existingIds].filter((id) => !wanted.has(id))

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('interview_topics')
        .delete()
        .eq('interview_id', interviewId)
        .in('topic_id', toDelete)
      if (delErr) {
        console.error('[useInterviewRelations] syncTopics delete:', delErr.message)
        setError('Erreur lors de la suppression de sujets')
        setSaving(false)
        return false
      }
    }
    if (toInsert.length > 0) {
      const ins = await (supabase.from('interview_topics') as unknown as {
        insert: (v: Record<string, unknown>[]) => Promise<SupaResult>
      }).insert(toInsert.map((tid) => ({ interview_id: interviewId, topic_id: tid })))
      if (ins.error) {
        console.error('[useInterviewRelations] syncTopics insert:', ins.error.message)
        setError('Erreur lors de l’ajout de sujets')
        setSaving(false)
        return false
      }
    }
    setSaving(false)
    return true
  }, [])

  const syncActors = useCallback(async (interviewId: string, actorIds: string[]): Promise<boolean> => {
    setSaving(true)
    setError(null)
    const { data: existing, error: selErr } = await supabase
      .from('interview_actors')
      .select('actor_id')
      .eq('interview_id', interviewId)
    if (selErr) {
      console.error('[useInterviewRelations] syncActors select:', selErr.message)
      setError('Erreur lors de la synchronisation des acteurs')
      setSaving(false)
      return false
    }
    const existingIds = new Set((existing ?? []).map((r) => (r as { actor_id: string }).actor_id))
    const wanted = new Set(actorIds)
    const toInsert = actorIds.filter((id) => !existingIds.has(id))
    const toDelete = [...existingIds].filter((id) => !wanted.has(id))

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('interview_actors')
        .delete()
        .eq('interview_id', interviewId)
        .in('actor_id', toDelete)
      if (delErr) {
        console.error('[useInterviewRelations] syncActors delete:', delErr.message)
        setError('Erreur lors de la suppression d’acteurs')
        setSaving(false)
        return false
      }
    }
    if (toInsert.length > 0) {
      const ins = await (supabase.from('interview_actors') as unknown as {
        insert: (v: Record<string, unknown>[]) => Promise<SupaResult>
      }).insert(toInsert.map((aid) => ({ interview_id: interviewId, actor_id: aid })))
      if (ins.error) {
        console.error('[useInterviewRelations] syncActors insert:', ins.error.message)
        setError('Erreur lors de l’ajout d’acteurs')
        setSaving(false)
        return false
      }
    }
    setSaving(false)
    return true
  }, [])

  return { syncTopics, syncActors, saving, error }
}
