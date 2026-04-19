import { useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'
import type { ControlPlanningInsert, ControlPlanningUpdate } from '../../../types/database.types'

interface UseSavePlanningResult {
  upsertPlanning: (missionId: string, controlId: string, data: ControlPlanningUpdate) => Promise<boolean>
  batchUpsert: (entries: ControlPlanningInsert[]) => Promise<boolean>
  saving: boolean
  error: string | null
}

export function useSavePlanning(onSuccess?: () => void): UseSavePlanningResult {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upsertPlanning = useCallback(async (missionId: string, controlId: string, data: ControlPlanningUpdate): Promise<boolean> => {
    setSaving(true)
    setError(null)

    // Cast: Supabase generated types resolve to `never` for new tables
    const res = await (supabase.from('control_planning') as unknown as {
      upsert: (v: Record<string, unknown>, opts: Record<string, string>) => Promise<{ error: { message: string } | null }>
    }).upsert(
      { mission_id: missionId, control_id: controlId, ...data },
      { onConflict: 'mission_id,control_id' }
    )
    const upsertError = res.error

    if (upsertError) {
      console.error('upsertPlanning:', upsertError.message)
      setError('Erreur lors de la sauvegarde.')
      setSaving(false)
      return false
    }

    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  const batchUpsert = useCallback(async (entries: ControlPlanningInsert[]): Promise<boolean> => {
    setSaving(true)
    setError(null)

    const res = await (supabase.from('control_planning') as unknown as {
      upsert: (v: Record<string, unknown>[], opts: Record<string, string>) => Promise<{ error: { message: string } | null }>
    }).upsert(entries as unknown as Record<string, unknown>[], { onConflict: 'mission_id,control_id' })
    const upsertError = res.error

    if (upsertError) {
      console.error('batchUpsert:', upsertError.message)
      setError('Erreur lors de la sauvegarde.')
      setSaving(false)
      return false
    }

    setSaving(false)
    onSuccess?.()
    return true
  }, [onSuccess])

  return { upsertPlanning, batchUpsert, saving, error }
}
