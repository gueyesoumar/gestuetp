import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

// Le client Supabase v2 type emet "never" pour les inserts sur les tables de
// ce projet - on utilise des casts unknown comme dans le reste du codebase.

type SupaResult = { error: { message: string } | null }

interface UseInterviewRelationsResult {
  syncActors: (interviewId: string, actorIds: string[]) => Promise<boolean>
  saving: boolean
  error: string | null
}

// Synchronise le lien M:N interview_actors avec un set d'IDs : insere les
// nouveaux, supprime ceux qui ne sont plus selectionnes.
export function useInterviewRelations(): UseInterviewRelationsResult {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return { syncActors, saving, error }
}
